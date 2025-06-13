/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from "jspdf"
import "jspdf-autotable"

// Add the missing type for jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ResultData {
  status: string
  confidence: number
  cancer_probability?: number
  imageUrl?: string
  patient_id: string
  sex?: string
  age?: string | number
  created_at?: string
  consultation_date?: string
}

export const generateResultPDF = async (result: ResultData): Promise<Blob> => {
  // Create a new PDF document
  const doc = new jsPDF()
  const isPositive = result.status === "Cancer"

  // Add header
  doc.setFontSize(22)
  doc.setTextColor(0, 51, 153) // Blue color for header
  doc.text("HISTOSCAN", 105, 20, { align: "center" })

  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text("Rapport d'analyse mammographique", 105, 30, { align: "center" })

  // Add date
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const today = new Date().toLocaleDateString("fr-FR")
  doc.text(`Date d'édition: ${today}`, 195, 20, { align: "right" })

  // Add patient information
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text("Informations patient:", 20, 50)

  doc.setFontSize(11)
  doc.text(`ID Patient: ${result.patient_id}`, 25, 60)
  if (result.sex) doc.text(`Sexe: ${result.sex}`, 25, 67)
  if (result.age) doc.text(`Âge: ${result.age} ans`, 25, 74)
  if (result.consultation_date) {
    const consultDate = new Date(result.consultation_date).toLocaleDateString("fr-FR")
    doc.text(`Date de consultation: ${consultDate}`, 25, 81)
  }

  // Add result box
  const resultBoxY = 95
  const resultBoxHeight = 40

  if (isPositive) {
    doc.setFillColor(255, 240, 240) // Light red for positive
    doc.setDrawColor(255, 0, 0)
  } else {
    doc.setFillColor(240, 255, 240) // Light green for negative
    doc.setDrawColor(0, 128, 0)
  }

  doc.rect(20, resultBoxY, 170, resultBoxHeight, "FD")

  // Add result text
  doc.setFontSize(14)
  if (isPositive) {
    doc.setTextColor(200, 0, 0)
    doc.text("CANCER DÉTECTÉ", 105, resultBoxY + 20, { align: "center" })
  } else {
    doc.setTextColor(0, 128, 0)
    doc.text("PAS DE CANCER DÉTECTÉ", 105, resultBoxY + 20, { align: "center" })
  }

  doc.setFontSize(12)
  doc.text(`Confiance: ${result.confidence.toFixed(0)}%`, 105, resultBoxY + 30, { align: "center" })

  // Add recommendation
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text("Recommandation:", 20, resultBoxY + resultBoxHeight + 20)

  if (isPositive) {
    doc.setTextColor(200, 0, 0)
    doc.text("Consulter un spécialiste en oncologie en urgence.", 25, resultBoxY + resultBoxHeight + 30)
  } else {
    doc.setTextColor(0, 128, 0)
    doc.text("Suivi régulier conseillé.", 25, resultBoxY + resultBoxHeight + 30)
  }

  // Add image if available
  if (result.imageUrl) {
    try {
      const img = await loadImage(result.imageUrl)
      doc.addImage(img, "JPEG", 120, 45, 70, 40)
    } catch (error) {
      console.error("Error loading image for PDF:", error)
    }
  }

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    "Ce rapport est généré par intelligence artificielle et doit être interprété par un professionnel de santé qualifié.",
    105,
    280,
    { align: "center" },
  )
  doc.text("© 2025 HISTOSCAN - Tous droits réservés", 105, 285, { align: "center" })

  return doc.output("blob")
}

// Helper function to load an image and return as base64
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/jpeg"))
      } else {
        reject(new Error("Could not get canvas context"))
      }
    }
    img.onerror = () => reject(new Error("Could not load image"))
    img.src = url
  })
}
