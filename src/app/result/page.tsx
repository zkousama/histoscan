/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { FileText, Share2, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { generateResultPDF } from "@/lib/pdf-generator"
import { Header } from "@/components/layout/header"
import { PageContainer } from "@/components/layout/page-container"
import { PageTitle } from "@/components/layout/page-title"
import { StyledCard } from "@/components/ui/styled-card"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ResultPage() {
  const [result, setResult] = useState<any>(null)
  const [processingTime] = useState(Math.floor(Math.random() * 50) + 100) // Simulate processing time
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("last_result")
    if (!stored) return router.push("/dashboard")
    setResult(JSON.parse(stored))
  }, [router])

  const generatePDF = async () => {
    if (!result) return

    setGeneratingPDF(true)
    try {
      const pdfBlob = await generateResultPDF(result)

      // Create a download link
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `HISTOSCAN_${result.patient_id}_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Une erreur est survenue lors de la génération du PDF")
    } finally {
      setGeneratingPDF(false)
    }
  }

  const shareResult = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Résultat d'analyse HISTOSCAN",
          text: `Résultat: ${result.status} (${result.confidence.toFixed(0)}% de confiance)`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Erreur lors du partage:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert("Lien copié dans le presse-papiers")
    }
  }

  if (!result) return null

  const isPositive = result.status === "Cancer"
  const confidenceColor = isPositive ? "text-red-600" : "text-green-600"
  const bgColor = isPositive ? "bg-red-50" : "bg-green-50"
  const borderColor = isPositive ? "border-red-200" : "border-green-200"
  const progressColor = isPositive ? "bg-red-500" : "bg-green-500"

  return (
    <>
      <Header showBackButton />
      <PageContainer maxWidth="lg">
        <PageTitle
          title="Résultat d'analyse"
          description={
            result.created_at
              ? `Analyse effectuée le ${format(new Date(result.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}`
              : undefined
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Preview */}
          <StyledCard title="Image analysée" icon={<img src="/file.svg" alt="File" className="h-5 w-5" />}>
            {result.imageUrl && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={result.imageUrl || "/placeholder.svg"}
                  alt="Mammographie analysée"
                  className="w-full h-64 object-contain bg-slate-100"
                />
              </div>
            )}
            {result.patient_id && (
              <div className="mt-4 text-sm text-slate-600 space-y-1">
                <p className="flex items-center">
                  <span className="font-medium w-24">ID Patient:</span>
                  <span className="font-mono">{result.patient_id}</span>
                </p>
                {result.sex && (
                  <p className="flex items-center">
                    <span className="font-medium w-24">Sexe:</span>
                    <span>{result.sex}</span>
                  </p>
                )}
                {result.age && (
                  <p className="flex items-center">
                    <span className="font-medium w-24">Âge:</span>
                    <span>{result.age} ans</span>
                  </p>
                )}
                {result.consultation_date && (
                  <p className="flex items-center">
                    <span className="font-medium w-24">Consultation:</span>
                    <span>{format(new Date(result.consultation_date), "dd MMMM yyyy", { locale: fr })}</span>
                  </p>
                )}
              </div>
            )}
          </StyledCard>

          {/* Results */}
          <StyledCard
            title="Résultat IA"
            className={`border-2 ${borderColor}`}
            contentClassName={bgColor}
            icon={
              isPositive ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )
            }
          >
            <div className="space-y-6">
              {/* Main Result */}
              <div className="text-center py-4">
                <div className="flex items-center justify-center mb-3">
                  {isPositive ? (
                    <AlertTriangle className="h-10 w-10 text-red-500 mr-2" />
                  ) : (
                    <CheckCircle className="h-10 w-10 text-green-500 mr-2" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${confidenceColor}`}>
                  {isPositive ? "CANCER DÉTECTÉ" : "PAS DE CANCER DÉTECTÉ"}
                </p>
                <p className={`text-lg ${confidenceColor} mt-1`}>({result.confidence.toFixed(0)}% de confiance)</p>
              </div>

              {/* Probability Bar */}
              <div className="space-y-2 bg-white p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Probabilité:</span>
                  <span className="font-semibold">
                    {result.cancer_probability?.toFixed(0) || result.confidence.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${progressColor}`}
                    style={{ width: `${result.cancer_probability?.toFixed(0) || result.confidence.toFixed(0)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Processing Time */}
              <div className="flex items-center text-sm text-slate-600 justify-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Temps de traitement: {processingTime} ms</span>
              </div>
            </div>
          </StyledCard>
        </div>

        {/* Recommendation */}
        <StyledCard
          className={`mt-8 border-2 ${borderColor}`}
          contentClassName={bgColor}
          title="Recommandation"
          icon={
            isPositive ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )
          }
        >
          <div className={`${confidenceColor} font-medium text-center py-2`}>
            {isPositive ? (
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>&quot;Consulter un spécialiste en oncologie en urgence.&quot;</p>
              </div>
            ) : (
              <p>&quot;Suivi régulier conseillé.&quot;</p>
            )}
          </div>
        </StyledCard>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button
            variant="outline"
            onClick={generatePDF}
            className="flex items-center space-x-2"
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span>Génération...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Générer un PDF</span>
              </>
            )}
          </Button>

          <Button variant="outline" onClick={shareResult} className="flex items-center space-x-2">
            <Share2 className="h-4 w-4" />
            <span>Partager</span>
          </Button>

          <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700 text-white">
            Retour au tableau de bord
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-xs text-slate-500 text-center">
          <p>
            Ce résultat est généré par intelligence artificielle et doit être interprété par un professionnel de santé
            qualifié.
          </p>
        </div>
      </PageContainer>
    </>
  )
}
