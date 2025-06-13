/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Upload, User, Search } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { Header } from "@/components/layout/header"
import { PageContainer } from "@/components/layout/page-container"
import { PageTitle } from "@/components/layout/page-title"
import { StyledCard } from "@/components/ui/styled-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Patient {
  patient_id: string
  sex: string
  age: number
  last_consultation: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState("new")
  const [existingPatients, setExistingPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [consultationDate, setConsultationDate] = useState<Date | undefined>(new Date())
  const [patientData, setPatientData] = useState({
    patient_id: "",
    sex: "",
    age: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Fetch existing patients on component mount
  useEffect(() => {
    const fetchExistingPatients = async () => {
      const { data, error } = await supabase
        .from("results")
        .select("patient_id, sex, age, consultation_date")
        .order("consultation_date", { ascending: false })

      if (data && !error) {
        // Group by patient_id and get the most recent data for each patient
        const uniquePatients = data.reduce(
          (acc, curr) => {
            if (!acc[curr.patient_id]) {
              acc[curr.patient_id] = {
                patient_id: curr.patient_id,
                sex: curr.sex || "",
                age: curr.age || 0,
                last_consultation: curr.consultation_date,
              }
            }
            return acc
          },
          {} as Record<string, Patient>,
        )

        setExistingPatients(Object.values(uniquePatients))
      }
    }

    fetchExistingPatients()
  }, [])

  // Filter existing patients based on search term
  const filteredPatients = existingPatients.filter((patient) =>
    patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFile = droppedFiles.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      handleFileSelection(imageFile)
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelection(selectedFile)
    }
  }

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientData({
      patient_id: patient.patient_id,
      sex: patient.sex,
      age: patient.age.toString(),
    })
  }

  const handleSubmit = async () => {
    const currentPatientId = activeTab === "new" ? patientData.patient_id : selectedPatient?.patient_id

    if (!file || !currentPatientId) {
      setError("Veuillez sélectionner une image et remplir l'ID patient")
      return
    }

    if (!consultationDate) {
      setError("Veuillez sélectionner une date de consultation")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("User not authenticated. Please log in again.")
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${currentPatientId}_${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(filePath)
      const imageUrl = publicUrlData.publicUrl

      // 3. Make prediction request
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Prediction API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // 4. Save result to database
      const finalPatientData =
        activeTab === "new"
          ? patientData
          : {
              patient_id: selectedPatient!.patient_id,
              sex: selectedPatient!.sex,
              age: selectedPatient!.age.toString(),
            }

      const { error: insertError } = await supabase.from("results").insert({
        user_id: user.id,
        patient_id: finalPatientData.patient_id,
        sex: finalPatientData.sex || null,
        age: finalPatientData.age ? Number.parseInt(finalPatientData.age) : null,
        consultation_date: format(consultationDate, "yyyy-MM-dd"),
        prediction: result.status,
        confidence: result.confidence,
        cancer_probability: result.cancer_probability,
        image_url: imageUrl,
      })

      if (insertError) {
        throw new Error(`Failed to save result: ${insertError.message}`)
      }

      // 5. Store result and redirect
      localStorage.setItem(
        "last_result",
        JSON.stringify({
          ...result,
          imageUrl,
          patient_id: finalPatientData.patient_id,
          sex: finalPatientData.sex,
          age: finalPatientData.age,
          consultation_date: format(consultationDate, "yyyy-MM-dd"),
        }),
      )
      router.push("/result")
    } catch (err) {
      console.error("Upload process error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header showBackButton />
      <PageContainer maxWidth="lg">
        <PageTitle title="Nouvelle analyse" description="Téléchargez une mammographie pour analyse" />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Patient Information Form */}
          <StyledCard title="Informations patient" icon={<User className="h-5 w-5 text-blue-600" />}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="new">Nouveau patient</TabsTrigger>
                <TabsTrigger value="existing">Patient existant</TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="space-y-4">
                <div>
                  <Label htmlFor="patient_id">ID Patient *</Label>
                  <Input
                    id="patient_id"
                    placeholder="Ex: XK-892"
                    value={patientData.patient_id}
                    onChange={(e) => setPatientData({ ...patientData, patient_id: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="sex">Sexe</Label>
                  <select
                    id="sex"
                    value={patientData.sex}
                    onChange={(e) => setPatientData({ ...patientData, sex: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="F">F - Féminin</option>
                    <option value="M">M - Masculin</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="age">Âge</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Ex: 45"
                    value={patientData.age}
                    onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="consultation_date" className="mb-2 block">
                    Date de consultation
                  </Label>
                  <DatePicker
                    date={consultationDate}
                    setDate={setConsultationDate}
                    placeholder="Sélectionner une date"
                  />
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-4">
                {/* Search existing patients */}
                <div>
                  <Label htmlFor="search">Rechercher un patient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Rechercher par ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Patient list */}
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">Aucun patient trouvé</div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <div
                        key={patient.patient_id}
                        className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${
                          selectedPatient?.patient_id === patient.patient_id ? "bg-blue-50 border-blue-200" : ""
                        }`}
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div className="font-medium">{patient.patient_id}</div>
                        <div className="text-sm text-slate-600">
                          {patient.sex && `${patient.sex}, `}
                          {patient.age && `${patient.age} ans, `}
                          Dernière consultation: {new Date(patient.last_consultation).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Selected patient info */}
                {selectedPatient && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium">Patient sélectionné:</h4>
                    <p className="text-sm text-slate-600">
                      ID: {selectedPatient.patient_id}
                      <br />
                      {selectedPatient.sex && `Sexe: ${selectedPatient.sex}`}
                      <br />
                      {selectedPatient.age && `Âge: ${selectedPatient.age} ans`}
                    </p>
                  </div>
                )}

                {/* New consultation date */}
                <div>
                  <Label htmlFor="consultation_date" className="mb-2 block">
                    Date de consultation
                  </Label>
                  <DatePicker
                    date={consultationDate}
                    setDate={setConsultationDate}
                    placeholder="Sélectionner une date"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </StyledCard>

          {/* Image Upload with Drag & Drop */}
          <StyledCard title="Mammographie" icon={<Upload className="h-5 w-5 text-blue-600" />}>
            {!preview ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 mb-4">GLISSEZ UNE MAMMOGRAPHIE ICI</p>
                <p className="text-sm text-slate-500 mb-4">ou</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Parcourir
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <p className="text-xs text-slate-400 mt-2">Formats acceptés: JPG, PNG, DICOM</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Prévisualisation"
                    className="w-full h-48 object-contain rounded"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      setPreview(null)
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            )}
          </StyledCard>
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <Button
            disabled={
              !file ||
              (activeTab === "new" && !patientData.patient_id) ||
              (activeTab === "existing" && !selectedPatient) ||
              !consultationDate ||
              loading
            }
            onClick={handleSubmit}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyse en cours...
              </>
            ) : (
              <>Lancer l&apos;analyse</>
            )}
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
