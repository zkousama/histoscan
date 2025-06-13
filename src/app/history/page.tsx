/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Search, Filter, Download, BarChart3, Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Header } from "@/components/layout/header";
import { PageContainer } from "@/components/layout/page-container";
import { PageTitle } from "@/components/layout/page-title";
import { StyledCard } from "@/components/ui/styled-card";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function HistoryPage() {
  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const { data } = await supabase
        .from("results")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setResults(data);
      setLoading(false);
    };

    fetchHistory();
  }, [router]);

  const filteredResults = results.filter((r) => {
    const matchesSearch = r.patient_id
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesDate =
      !dateFilter ||
      new Date(r.created_at).toDateString() === dateFilter.toDateString();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "positive" && r.prediction === "Cancer") ||
      (statusFilter === "negative" && r.prediction !== "Cancer");

    return matchesSearch && matchesDate && matchesStatus;
  });

  const todayResults = results.filter((r) => {
    const today = new Date().toDateString();
    return new Date(r.created_at).toDateString() === today;
  });

  const positiveResults = filteredResults.filter(
    (r) => r.prediction === "Cancer"
  );
  const negativeResults = filteredResults.filter(
    (r) => r.prediction !== "Cancer"
  );

  const exportData = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "ID Patient,Date,Résultat,Confiance,Probabilité Cancer\n" +
      filteredResults
        .map(
          (r) =>
            `${r.patient_id},${new Date(r.created_at).toLocaleDateString()},${
              r.prediction
            },${r.confidence}%,${r.cancer_probability || r.confidence}%`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historique_analyses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement de l&apos;historique...</div>
      </div>
    );
  }

  return (
    <>
      <Header
        showBackButton
        rightContent={
          <Button
            variant="outline"
            onClick={exportData}
            className="flex items-center space-x-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </Button>
        }
      />
      <PageContainer>
        <PageTitle
          title="Historique des analyses"
          description="Consultez l'historique complet des analyses"
        />

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
            title="Cas négatifs"
            value={negativeResults.length}
            icon={<BarChart3 className="h-6 w-6 text-green-600" />}
            iconClassName="bg-green-100"
            valueClassName="text-green-600"
          />

          <StatsCard
            title="Cas positifs"
            value={positiveResults.length}
            icon={<BarChart3 className="h-6 w-6 text-red-600" />}
            iconClassName="bg-red-100"
            valueClassName="text-red-600"
          />
        </div>

        {/* Filters */}
        <StyledCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <DatePicker
                date={dateFilter}
                setDate={setDateFilter}
                placeholder="Filtrer par date"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les résultats</option>
              <option value="positive">Cas positifs</option>
              <option value="negative">Cas négatifs</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setDateFilter(undefined);
                setStatusFilter("all");
              }}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Réinitialiser</span>
            </Button>
          </div>
        </StyledCard>

        {/* Results Grid */}
        <div className="space-y-4">
          {filteredResults.length === 0 ? (
            <StyledCard>
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  Aucun résultat trouvé
                </h3>
                <p className="text-slate-500">
                  Essayez de modifier vos filtres de recherche
                </p>
              </div>
            </StyledCard>
          ) : (
            filteredResults.map((result) => (
              <StyledCard
                key={result.id}
                className="hover:border-blue-200 transition-colors cursor-pointer"
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
                      created_at: result.created_at,
                      consultation_date: result.consultation_date,
                    })
                  );
                  router.push("/result");
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-3 sm:mb-0">
                    <div className="flex items-center space-x-3">
                      <div className="font-mono text-lg font-medium">
                        {result.patient_id}
                      </div>
                      <StatusBadge
                        status={
                          result.prediction === "Cancer"
                            ? "negative"
                            : "positive"
                        }
                        label={result.prediction}
                      />
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                      <span>
                        {format(new Date(result.created_at), "dd MMMM yyyy", {
                          locale: fr,
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(result.created_at), "HH:mm", {
                          locale: fr,
                        })}
                      </span>
                      {result.sex && (
                        <>
                          <span>•</span>
                          <span>{result.sex}</span>
                        </>
                      )}
                      {result.age && (
                        <>
                          <span>•</span>
                          <span>{result.age} ans</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div
                      className={`text-2xl font-bold ${
                        result.prediction === "Cancer"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {result.confidence.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </StyledCard>
            ))
          )}
        </div>

        {/* Pagination info */}
        {filteredResults.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Affichage de {filteredResults.length} résultat
            {filteredResults.length > 1 ? "s" : ""} sur {results.length} au
            total
          </div>
        )}
      </PageContainer>
    </>
  );
}
