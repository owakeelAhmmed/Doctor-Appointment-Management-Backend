import PDFDocument from "pdfkit";
import fs from "fs";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

/**
 * Generate PDF for prescription
 */
export async function generatePrescriptionPDF(prescription) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Prescription-${prescription._id}`,
          Author: "Doctor Appointment System",
        },
      });

      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Doctor Appointment System", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(16)
        .text("Medical Prescription", { align: "center" })
        .moveDown(1);

      // Line
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1);

      // Doctor Information
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Doctor Information:", { underline: true })
        .font("Helvetica")
        .moveDown(0.5);

      const doctorName = prescription.doctor?.user?.fullName || "N/A";
      const doctorSpecialization = prescription.doctor?.specialization || "N/A";
      
      doc
        .text(`Name: Dr. ${doctorName}`)
        .text(`Specialization: ${doctorSpecialization}`)
        .text(`BMDC Reg: ${prescription.doctor?.bmdcRegNo || "N/A"}`)
        .moveDown(1);

      // Patient Information
      doc
        .font("Helvetica-Bold")
        .text("Patient Information:", { underline: true })
        .font("Helvetica")
        .moveDown(0.5);

      const patientName = prescription.patient?.user?.fullName || "N/A";
      const patientAge = prescription.patient?.user?.age || "N/A";
      const patientBloodGroup = prescription.patient?.bloodGroup || "N/A";
      const appointmentDate = prescription.appointment?.appointmentDate 
        ? format(new Date(prescription.appointment.appointmentDate), "dd MMMM yyyy", { locale: bn })
        : "N/A";

      doc
        .text(`Name: ${patientName}`)
        .text(`Age: ${patientAge}`)
        .text(`Blood Group: ${patientBloodGroup}`)
        .text(`Date: ${appointmentDate}`)
        .moveDown(1);

      // Diagnosis
      doc
        .font("Helvetica-Bold")
        .text("Diagnosis:", { underline: true })
        .font("Helvetica")
        .moveDown(0.5)
        .text(prescription.diagnosis || "N/A")
        .moveDown(1);

      // Medicines
      if (prescription.medicines && prescription.medicines.length > 0) {
        doc
          .font("Helvetica-Bold")
          .text("Prescribed Medicines:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5);

        prescription.medicines.forEach((medicine, index) => {
          const beforeMeal = medicine.beforeMeal ? " (Before Meal)" : " (After Meal)";
          doc
            .text(`${index + 1}. ${medicine.name} - ${medicine.dosage} - ${medicine.frequency}${beforeMeal}`)
            .fontSize(10)
            .text(`   Duration: ${medicine.duration || "As directed"}`)
            .text(`   Instructions: ${medicine.instructions || "No special instructions"}`)
            .fontSize(12)
            .moveDown(0.5);
        });
        doc.moveDown(0.5);
      }

      // Tests
      if (prescription.tests && prescription.tests.length > 0) {
        doc
          .font("Helvetica-Bold")
          .text("Recommended Tests:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5);

        prescription.tests.forEach((test, index) => {
          doc
            .text(`${index + 1}. ${test.name}`)
            .fontSize(10)
            .text(`   Instructions: ${test.instructions || "No special instructions"}`)
            .fontSize(12)
            .moveDown(0.5);
        });
        doc.moveDown(0.5);
      }

      // Advice
      if (prescription.advice) {
        doc
          .font("Helvetica-Bold")
          .text("Advice & Recommendations:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5)
          .text(prescription.advice)
          .moveDown(1);
      }

      // Follow-up
      if (prescription.followUpDate) {
        const followUpDate = format(new Date(prescription.followUpDate), "dd MMMM yyyy", { locale: bn });
        doc
          .font("Helvetica-Bold")
          .text("Follow-up Date:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5)
          .text(followUpDate)
          .moveDown(1);
      }

      // Notes
      if (prescription.notes) {
        doc
          .font("Helvetica-Bold")
          .text("Additional Notes:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5)
          .text(prescription.notes)
          .moveDown(1);
      }

      // Digital Signature
      if (prescription.digitalSignature?.url) {
        doc
          .font("Helvetica-Bold")
          .text("Digital Signature:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5);

        // Add signature image if available
        // doc.image(prescription.digitalSignature.url, { width: 150 });
      } else {
        doc
          .font("Helvetica-Bold")
          .text("Doctor's Signature:", { underline: true })
          .font("Helvetica")
          .moveDown(0.5)
          .text("(Electronically Generated)")
          .moveDown(0.5);
      }

      // Footer
      doc
        .moveDown(2)
        .fontSize(10)
        .text(
          "This is a computer-generated prescription. No physical signature is required.",
          { align: "center", color: "gray" }
        )
        .text(
          `Generated on: ${format(new Date(), "dd MMMM yyyy, hh:mm a", { locale: bn })}`,
          { align: "center", color: "gray" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format frequency for display
 */
export function formatFrequency(frequency) {
  const formats = {
    "1+0+0": "Once daily (Morning)",
    "0+1+0": "Once daily (Afternoon)",
    "0+0+1": "Once daily (Night)",
    "1+1+0": "Twice daily (Morning + Afternoon)",
    "1+0+1": "Twice daily (Morning + Night)",
    "0+1+1": "Twice daily (Afternoon + Night)",
    "1+1+1": "Three times daily",
    "1+1+1+1": "Four times daily",
    "as-needed": "As needed",
  };
  
  return formats[frequency] || frequency;
}

/**
 * Calculate next follow-up date
 */
export function calculateFollowUpDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Parse medicine instructions
 */
export function parseMedicineInstructions(medicine) {
  const instructions = [];
  
  if (medicine.beforeMeal) {
    instructions.push("Take before meal");
  } else {
    instructions.push("Take after meal");
  }
  
  if (medicine.duration) {
    instructions.push(`For ${medicine.duration}`);
  }
  
  if (medicine.instructions) {
    instructions.push(medicine.instructions);
  }
  
  return instructions.join(". ");
}