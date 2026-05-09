import type { Method } from "./comparatorTypes";

export const METHODS_CHIRURGIA_EN: Record<string, Method> = {
    extraction_simple: {
        id: "extraction_simple", label: "Simple extraction", short: "Quick removal of a mobile or damaged tooth.",
        icon: "🦷", color: "#ef4444", recommendedSpecialist: "marcin",
        table: {
            time: { value: "15–30 min", scale: 5, tooltip: "Single short appointment." },
            visits: { value: "1–2", scale: 5, tooltip: "Extraction + check-up." },
            durability: { value: "Permanent", scale: 5, tooltip: "Tooth removed. Gap to be restored." },
            invasiveness: { value: "Medium", scale: 3, tooltip: "Extraction under local anaesthesia." },
            risk: { value: "Low", scale: 4, tooltip: "Standard risks: swelling, minor bleeding." },
            hygiene: { value: "Wound care", scale: 3, tooltip: "Gentle rinsing, no vigorous spitting, avoid smoking." },
            worksWhen: ["Mobile tooth", "Tooth beyond repair", "Before orthodontic or prosthetic treatment"],
            notIdealWhen: ["Tooth can be saved by endo + crown", "Anatomically challenging root", "Systemic conditions limiting surgery"],
            maintenance: { value: "Check-up after 1 week", tooltip: "Assessment of healing." },
        },
        metrics: { durabilityScore: 100, speedScore: 95, minInvasiveScore: 30, maintenanceScore: 95, riskScore: 72 },
    },
    extraction_surgical: {
        id: "extraction_surgical", label: "Surgical extraction", short: "Complex removal — mucoperiosteal flap, osteotomy, root separation.",
        icon: "🔪", color: "#dc2626", recommendedSpecialist: "marcin",
        table: {
            time: { value: "30–60 min", scale: 4, tooltip: "May require bone removal and root separation." },
            visits: { value: "2–3", scale: 4, tooltip: "Extraction + check-up + suture removal." },
            durability: { value: "Permanent", scale: 5, tooltip: "Tooth removed. Augmentation may follow." },
            invasiveness: { value: "High", scale: 2, tooltip: "Flap, osteotomy, sometimes root separation." },
            risk: { value: "Medium", scale: 3, tooltip: "Greater risk of swelling, pain, nerve proximity." },
            hygiene: { value: "Wound care", scale: 3, tooltip: "Cold compresses, soft diet, no smoking." },
            worksWhen: ["Impacted or broken tooth", "Wisdom tooth removal", "Pre-implant planning requires extraction"],
            notIdealWhen: ["Tooth is mobile — simple extraction suffices", "Uncontrolled diabetes", "Concurrent active infection (may need antibiotics first)"],
            maintenance: { value: "Check-up + X-ray", tooltip: "Check-up at 1 week and 1 month." },
        },
        metrics: { durabilityScore: 100, speedScore: 82, minInvasiveScore: 15, maintenanceScore: 90, riskScore: 55 },
    },
    bone_augmentation: {
        id: "bone_augmentation", label: "Bone augmentation", short: "Bone rebuilding before implantation.",
        icon: "🧱", color: "#f59e0b", recommendedSpecialist: "marcin",
        table: {
            time: { value: "4–9 months", scale: 1, tooltip: "Augmentation + healing + implant." },
            visits: { value: "3–5", scale: 3, tooltip: "Surgery, check-ups, implant." },
            durability: { value: "Permanent", scale: 4, tooltip: "Rebuilt bone integrates into the organism." },
            invasiveness: { value: "High", scale: 2, tooltip: "Surgical procedure with bone material/membrane." },
            risk: { value: "Medium", scale: 3, tooltip: "Infection, graft failure, swelling." },
            hygiene: { value: "Wound care", scale: 2, tooltip: "Strict post-op care." },
            worksWhen: ["Insufficient bone for an implant", "Post-extraction bone resorption", "Sinus floor too low (sinus lift)"],
            notIdealWhen: ["No implant planned", "Systemic diseases limiting healing", "Patient does not accept the waiting period"],
            maintenance: { value: "X-ray monitoring", tooltip: "Bone volume check before implant." },
        },
        metrics: { durabilityScore: 85, speedScore: 15, minInvasiveScore: 15, maintenanceScore: 85, riskScore: 52 },
    },
};
