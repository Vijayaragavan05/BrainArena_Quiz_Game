import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Quiz, QuizResult, StudentAnswer, Question, PerformanceAnalysis, LearningInsight } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import type { PopulatedQuiz } from '../types/populated.js';

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(','));
  return '\uFEFF' + lines.join('\n');
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ---------- Quiz questions CSV (also a valid import template) ----------
export async function exportQuizCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = String(req.user!._id);
    const quiz = await Quiz.findOne({ _id: req.params.quizId, teacher: teacherId }).populate('questions');
    if (!quiz) throw new AppError(404, 'Quiz not found');
    const pq = quiz as unknown as PopulatedQuiz;

    const header = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F', 'Correct', 'Explanation', 'Topic', 'Difficulty'];
    const rows = pq.questions.map((q) => [
      q.text,
      ...q.options,
      ...[...Array(6 - q.options.length)].fill(''),
      String.fromCharCode(65 + q.correctIndex),
      q.explanation,
      q.topic,
      q.difficulty,
    ]);

    const filename = `${sanitize(quiz.title)}-questions.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(header, rows));
  } catch (err) {
    next(err);
  }
}

// ---------- Class results CSV ----------
export async function exportQuizResultsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = String(req.user!._id);
    const quiz = await Quiz.findOne({ _id: req.params.quizId, teacher: teacherId });
    if (!quiz) throw new AppError(404, 'Quiz not found');

    const results = await QuizResult.find({ quiz: quiz._id }).populate('student', 'name email').sort({ score: -1 });

    const header = ['Rank', 'Student', 'Email', 'Score', 'Accuracy %', 'Correct', 'Wrong', 'Unanswered', 'Avg Response (s)'];
    const rows = results.map((r, i) => {
      const s = r.student as unknown as { name?: string; email?: string };
      return [
        i + 1,
        s.name ?? 'Student',
        s.email ?? '',
        r.score,
        Math.round(r.accuracy * 100),
        r.correct,
        r.wrong,
        r.unanswered,
        (r.avgResponseTimeMs / 1000).toFixed(1),
      ];
    });

    const filename = `${sanitize(quiz.title)}-results.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(header, rows));
  } catch (err) {
    next(err);
  }
}

// ---------- Class results XLSX ----------
export async function exportQuizResultsXlsx(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = String(req.user!._id);
    const quiz = await Quiz.findOne({ _id: req.params.quizId, teacher: teacherId });
    if (!quiz) throw new AppError(404, 'Quiz not found');

    const results = await QuizResult.find({ quiz: quiz._id }).populate('student', 'name email').sort({ score: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');
    ws.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Student', key: 'student', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Accuracy %', key: 'accuracy', width: 12 },
      { header: 'Correct', key: 'correct', width: 10 },
      { header: 'Wrong', key: 'wrong', width: 10 },
      { header: 'Unanswered', key: 'unanswered', width: 12 },
      { header: 'Avg Response (s)', key: 'avg', width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    results.forEach((r, i) => {
      const s = r.student as unknown as { name?: string; email?: string };
      ws.addRow({
        rank: i + 1,
        student: s.name ?? 'Student',
        email: s.email ?? '',
        score: r.score,
        accuracy: Math.round(r.accuracy * 100),
        correct: r.correct,
        wrong: r.wrong,
        unanswered: r.unanswered,
        avg: +(r.avgResponseTimeMs / 1000).toFixed(1),
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const filename = `${sanitize(quiz.title)}-results.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    next(err);
  }
}

// ---------- Student report PDF ----------
export async function exportStudentReportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = String(req.user!._id);
    const { resultId } = req.params;

    const result = await QuizResult.findOne({ _id: resultId, student: studentId }).populate('quiz', 'title topic difficulty');
    if (!result) throw new AppError(404, 'Result not found');
    const qz = result.quiz as unknown as { title: string; topic: string; difficulty: string };

    const [performance, insights, answers] = await Promise.all([
      PerformanceAnalysis.findOne({ student: studentId, session: result.session }),
      LearningInsight.findOne({ student: studentId, session: result.session }),
      StudentAnswer.find({ student: studentId, session: result.session }).sort({ questionIndex: 1 }),
    ]);

    const questionIds = answers.map((a) => a.question);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const qMap = new Map(questions.map((q) => [String(q._id), q]));

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `${sanitize(qz.title)}-report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#111827').text('BrainArena - Performance Report').moveDown(0.3);
    doc.fontSize(13).fillColor('#374151').text(`${qz.title} (${qz.topic} · ${qz.difficulty})`).moveDown(0.4);

    doc.fontSize(11).fillColor('#111827');
    doc.text(`Score: ${result.score}`);
    doc.text(`Rank: #${result.rank}`);
    doc.text(`Accuracy: ${Math.round(result.accuracy * 100)}%`);
    doc.text(`Correct: ${result.correct}  Wrong: ${result.wrong}  Unanswered: ${result.unanswered}`);
    doc.text(`Avg response: ${(result.avgResponseTimeMs / 1000).toFixed(1)}s`);
    doc.text(`Speed/accuracy: ${performance?.speedVsAccuracy ?? 'n/a'}`);
    doc.moveDown(0.6);

    doc.fontSize(13).fillColor('#111827').text('Personalized insights').moveDown(0.3);
    const recs = insights?.recommendations ?? [];
    if (recs.length === 0) doc.fontSize(10).fillColor('#6b7280').text('No insights available yet.');
    for (const r of recs) {
      doc.fontSize(10).fillColor('#111827').text(`• ${r.topic}: ${r.message}`);
    }
    doc.moveDown(0.6);

    doc.fontSize(13).fillColor('#111827').text('Question-by-question').moveDown(0.3);
    answers.forEach((a, i) => {
      const q = qMap.get(String(a.question));
      doc.fontSize(10).fillColor('#111827');
      doc.text(
        `Q${a.questionIndex + 1}. ${a.questionSnapshot.text}  [${a.isCorrect ? 'CORRECT' : a.selectedIndex === null ? 'UNANSWERED' : 'WRONG'}]`,
      );
      doc.fontSize(9).fillColor('#6b7280');
      doc.text(`   Your answer: ${a.selectedIndex === null ? '—' : `${LETTERS[a.selectedIndex]}. ${a.questionSnapshot.options[a.selectedIndex] ?? ''}`}`);
      doc.text(`   Correct: ${LETTERS[a.correctIndex]}. ${a.questionSnapshot.options[a.correctIndex] ?? ''}`);
      if (q?.explanation) doc.text(`   Why: ${q.explanation}`);
      doc.moveDown(0.2);
      if (i % 4 === 3) doc.addPage();
    });

    doc.end();
  } catch (err) {
    next(err);
  }
}

function sanitize(s: string): string {
  return (s || 'report').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
}