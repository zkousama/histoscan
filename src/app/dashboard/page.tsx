/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Search, Plus, BarChart3, AlertTriangle, Calendar } from "lucide-react"
import { Header } from "@/components/layout/header"
import { PageContainer } from "@/components/layout/page-container"
import { PageTitle } from "@/components/layout/page-title"
import { StyledCard } from "@/components/ui/styled-card"
import { StatsCard } from "@/components/ui/stats-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function Dashboard() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fetchResults = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { data, error } = await supabase
        .from("results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (data) setResults(data)
      setLoading(false)
    }

    fetchResults()
  }, [router])

  const todayResults = results.filter((r) => {
    const today = new Date().toDateString()
    return new Date(r.created_at).toDateString() === today
  })

  const criticalCases = results.filter((r) => r.prediction === "Cancer")

  const filteredResults = results.filter((r) => r.patient_id.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle
          title="Tableau de bord"
          description="Bienvenue sur votre tableau de bord HISTOSCAN"
          actions={
            <Button
              onClick={() => router.push("/upload")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle analyse
            </Button>
          }
        />

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Analyses aujourd'hui"
            value={todayResults.length}
            icon={<Calendar className="h-6 w-6 text-blue-600" />}
            iconClassName="bg-blue-100"
            valueClassName="text-blue-600"
          />

          <StatsCard
            title="Cas critiques"
            value={criticalCases.length}
            icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            iconClassName="bg-red-100"
            valueClassName="text-red-600"
          />

          <StatsCard
            title="Total des analyses"
            value={results.length}
            icon={<BarChart3 className="h-6 w-6 text-indigo-600" />}
            iconClassName="bg-indigo-100"
            valueClassName="text-indigo-600"
          />
        </div>

        {/* Results Table */}
        <StyledCard title="Historique récent" icon={<Calendar className="h-5 w-5 text-blue-600" />}>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 border-b pb-2">
              <div>ID PATIENT</div>
              <div>DATE</div>
              <div>RÉSULTAT</div>
              <div>CONFIANCE</div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Aucun résultat trouvé</div>
            ) : (
              filteredResults.slice(0, 10).map((result) => (
                <div
                  key={result.id}
                  className="grid grid-cols-4 gap-4 items-center py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer rounded-md transition-colors"
                  onClick={() => {
                    localStorage.setItem(
                      "last_result",
                      JSON.stringify({
                        status: result.prediction,
                        confidence: result.confidence,
                        cancer_probability: result.cancer_probability,
                        imageUrl: result.image_url,
                        patient_id: result.patient_id,
                        sex: result.sex,
                        age: result.age,
                      }),
                    )
                    router.push("/result")
                  }}
                >
                  <div className="font-mono text-sm font-medium">{result.patient_id}</div>
                  <div className="text-sm text-slate-600">
                    {format(new Date(result.created_at), "dd MMM yyyy", { locale: fr })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge
                      status={result.prediction === "Cancer" ? "negative" : "positive"}
                      label={result.prediction}
                    />
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      result.prediction === "Cancer" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {result.confidence.toFixed(0)}%
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredResults.length > 0 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => router.push("/history")}>
                Voir tout l&apos;historique
              </Button>
            </div>
          )}
        </StyledCard>
      </PageContainer>
    </>
  )
}
