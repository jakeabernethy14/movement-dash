import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TrainingPlan, Goal, Checkup, ScheduleEvent } from "@/lib/types";

const GOLD: [number, number, number] = [217, 154, 33];
const DARK: [number, number, number] = [18, 18, 18];

function header(doc: jsPDF, title: string) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, "F");
  doc.setTextColor(...GOLD);
  doc.setFontSize(14);
  doc.text("The Movement Coaching", 14, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title, 14, 20);
  doc.setTextColor(0, 0, 0);
}

export function exportTrainingPlanPDF(plan: TrainingPlan, clientName?: string) {
  const doc = new jsPDF();
  header(doc, `Training Plan: ${plan.title}${clientName ? " — " + clientName : ""}`);
  let y = 36;
  doc.setFontSize(10);
  if (plan.description) {
    doc.text(doc.splitTextToSize(plan.description, 180), 14, y);
    y += 10;
  }
  plan.content.forEach((day) => {
    autoTable(doc, {
      startY: y,
      head: [[day.day, "Sets", "Reps", "Weight", "Notes"]],
      body: day.exercises.map((ex) => [ex.name, ex.sets, ex.reps, ex.weight ?? "-", ex.notes ?? ""]),
      headStyles: { fillColor: GOLD, textColor: 20 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 8;
  });
  doc.save(`${plan.title.replace(/\s+/g, "_")}.pdf`);
}

export function exportGoalsPDF(goals: Goal[], clientName: string) {
  const doc = new jsPDF();
  header(doc, `Goals — ${clientName}`);
  autoTable(doc, {
    startY: 36,
    head: [["Goal", "Target date", "Status", "Progress"]],
    body: goals.map((g) => [
      g.title,
      g.target_date ?? "-",
      g.status.replace("_", " "),
      `${g.progress}%`,
    ]),
    headStyles: { fillColor: GOLD, textColor: 20 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  doc.save(`Goals_${clientName.replace(/\s+/g, "_")}.pdf`);
}

export function exportCheckupsPDF(checkups: Checkup[], clientName: string) {
  const doc = new jsPDF();
  header(doc, `Check-up History — ${clientName}`);
  autoTable(doc, {
    startY: 36,
    head: [["Date", "Weight (kg)", "Body fat %", "Notes"]],
    body: checkups.map((c) => [
      c.checkup_date,
      c.weight_kg?.toString() ?? "-",
      c.body_fat_pct?.toString() ?? "-",
      c.notes ?? "",
    ]),
    headStyles: { fillColor: GOLD, textColor: 20 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  doc.save(`Checkups_${clientName.replace(/\s+/g, "_")}.pdf`);
}

export function exportSchedulePDF(events: ScheduleEvent[], clientName: string, monthLabel: string) {
  const doc = new jsPDF();
  header(doc, `Schedule — ${clientName} (${monthLabel})`);
  autoTable(doc, {
    startY: 36,
    head: [["Date", "Time", "Title", "Type", "Description"]],
    body: events.map((e) => [
      e.event_date,
      e.start_time ?? "-",
      e.title,
      e.event_type,
      e.description ?? "",
    ]),
    headStyles: { fillColor: GOLD, textColor: 20 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  doc.save(`Schedule_${clientName.replace(/\s+/g, "_")}.pdf`);
}
