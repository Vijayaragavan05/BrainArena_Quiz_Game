import { api } from './api';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  const match = /filename="?([^"]+)"?/.exec(header ?? '');
  return match?.[1] ?? fallback;
}

async function downloadEndpoint(path: string, fallbackName: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const blob = res.data as Blob;
  const fileName = filenameFromDisposition(res.headers['content-disposition'], fallbackName);
  download(blob, fileName);
}

export function exportQuizQuestionsCsv(quizId: string) {
  return downloadEndpoint(`/export/quiz/${quizId}/questions/csv`, 'quiz-questions.csv');
}

export function exportQuizResultsCsv(quizId: string) {
  return downloadEndpoint(`/export/quiz/${quizId}/results/csv`, 'quiz-results.csv');
}

export function exportQuizResultsXlsx(quizId: string) {
  return downloadEndpoint(`/export/quiz/${quizId}/results/xlsx`, 'quiz-results.xlsx');
}

export function exportStudentReportPdf(resultId: string) {
  return downloadEndpoint(`/export/student/${resultId}/pdf`, 'report.pdf');
}