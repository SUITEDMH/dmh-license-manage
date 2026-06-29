import { useState } from "react";
import { useLocation } from "wouter";
import { useGenerateLicense, getListLicensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, ArrowLeft, Key, Monitor, Plus, Trash2, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_NAMES, LICENSE_TYPES } from "@/lib/constants";

// ── Schémas ──────────────────────────────────────────────────────────────────
const generateSchema = z.object({
  machineId: z.string().min(1, "L'ID de la machine est requis"),
  product: z.string().min(1, "Sélectionnez un produit"),
  licenseType: z.string().min(1, "Sélectionnez un type de licence"),
  durationDays: z.coerce.number().optional().nullable(),
  clientName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type GenerateValues = z.infer<typeof generateSchema>;

interface GeneratedEntry {
  poste: number;
  machineId: string;
  key: string;
}

const MAX_POSTES = 3;

// ── Composant résultat mono-poste ─────────────────────────────────────────────
function ResultSingle({
  licenseKey,
  onBack,
  onNew,
}: {
  licenseKey: string;
  onBack: () => void;
  onNew: () => void;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast({ title: "Clé copiée dans le presse-papiers" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8">
      <Button variant="ghost" onClick={onBack} className="-ml-4 mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux licences
      </Button>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Licence générée !</CardTitle>
          <CardDescription className="text-base mt-2">
            La clé de licence a été créée et associée à la machine cible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-6 rounded-lg border flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Clé de licence</div>
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-foreground break-all text-center">
              {licenseKey}
            </div>
            <Button onClick={handleCopy} className="mt-6 w-full sm:w-auto" size="lg" variant={hasCopied ? "secondary" : "default"}>
              {hasCopied ? <><Check className="mr-2 h-5 w-5" />Copié !</> : <><Copy className="mr-2 h-5 w-5" />Copier la clé</>}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-10 gap-4">
          <Button variant="outline" onClick={onBack}>Voir toutes les licences</Button>
          <Button onClick={onNew}>Générer une autre</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ── Composant résultat multi-postes ───────────────────────────────────────────
function ResultMulti({
  entries,
  onBack,
  onNew,
}: {
  entries: GeneratedEntry[];
  onBack: () => void;
  onNew: () => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyOne = (key: string, idx: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({ title: `Clé poste ${idx + 1} copiée` });
  };

  const handleCopyAll = () => {
    const text = entries
      .map((e) => `Poste ${e.poste} (${e.machineId}):\n${e.key}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
    toast({ title: "Toutes les clés copiées" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8">
      <Button variant="ghost" onClick={onBack} className="-ml-4 mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux licences
      </Button>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-6 pt-10">
          <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full mb-4">
            <Monitor className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{entries.length} licences générées !</CardTitle>
          <CardDescription className="text-base mt-2">
            Une clé par poste — transmettez chaque clé à la machine correspondante.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="bg-muted rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Poste {entry.poste}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {entry.machineId.slice(0, 12)}…
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm font-bold tracking-wider bg-background border rounded px-3 py-2 break-all">
                  {entry.key}
                </code>
                <Button
                  size="icon"
                  variant={copiedIdx === idx ? "secondary" : "outline"}
                  onClick={() => handleCopyOne(entry.key, idx)}
                  className="shrink-0"
                >
                  {copiedIdx === idx ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-center pb-10 gap-3 pt-2">
          <Button size="lg" onClick={handleCopyAll} variant={allCopied ? "secondary" : "default"} className="w-full sm:w-auto">
            {allCopied
              ? <><Check className="mr-2 h-5 w-5" />Tout copié !</>
              : <><ClipboardList className="mr-2 h-5 w-5" />Copier toutes les clés</>}
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">Voir les licences</Button>
          <Button onClick={onNew} className="w-full sm:w-auto">Générer d'autres</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function GenerateLicense() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateLicense = useGenerateLicense();

  // Mode : "single" | "multi"
  const [mode, setMode] = useState<"single" | "multi">("single");

  // Résultats
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedMulti, setGeneratedMulti] = useState<GeneratedEntry[] | null>(null);

  // Champs multi-postes (toujours 3 slots)
  const [machineIds, setMachineIds] = useState<string[]>(["", "", ""]);

  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<GenerateValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      machineId: "",
      product: "suite",
      licenseType: "subscription",
      durationDays: null,
      clientName: "",
      notes: "",
    },
  });

  const licenseType = form.watch("licenseType");

  // ── Soumission poste unique ───────────────────────────────────────────────
  const onSubmitSingle = (values: GenerateValues) => {
    generateLicense.mutate({ data: values }, {
      onSuccess: (data) => {
        setGeneratedKey(data.licenseKey);
        toast({ title: "Licence générée avec succès" });
        queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Erreur lors de la génération", description: "Vérifiez les informations fournies." });
      },
    });
  };

  // ── Soumission multi-postes ───────────────────────────────────────────────
  const onSubmitMulti = async () => {
    const values = form.getValues();
    const activeIds = machineIds.filter((id) => id.trim() !== "");

    if (activeIds.length === 0) {
      toast({ variant: "destructive", title: "Ajoutez au moins un ID machine" });
      return;
    }

    setIsGenerating(true);
    const results: GeneratedEntry[] = [];

    for (let i = 0; i < activeIds.length; i++) {
      await new Promise<void>((resolve, reject) => {
        generateLicense.mutate(
          {
            data: {
              ...values,
              machineId: activeIds[i].trim(),
              notes: values.notes
                ? `${values.notes} — Poste ${i + 1}/${activeIds.length}`
                : `Poste ${i + 1}/${activeIds.length}`,
            },
          },
          {
            onSuccess: (data) => {
              results.push({ poste: i + 1, machineId: activeIds[i].trim(), key: data.licenseKey });
              resolve();
            },
            onError: () => reject(),
          }
        );
      }).catch(() => {
        toast({ variant: "destructive", title: `Erreur sur le poste ${i + 1}` });
      });
    }

    setIsGenerating(false);

    if (results.length > 0) {
      setGeneratedMulti(results);
      queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
      toast({ title: `${results.length} licence(s) générée(s) avec succès` });
    }
  };

  const handleReset = () => {
    setGeneratedKey(null);
    setGeneratedMulti(null);
    setMachineIds(["", "", ""]);
    form.reset();
  };

  // ── Résultats ─────────────────────────────────────────────────────────────
  if (generatedKey) {
    return <ResultSingle licenseKey={generatedKey} onBack={() => setLocation("/licenses")} onNew={handleReset} />;
  }
  if (generatedMulti) {
    return <ResultMulti entries={generatedMulti} onBack={() => setLocation("/licenses")} onNew={handleReset} />;
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/licenses")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Générer une licence</h1>
          <p className="text-muted-foreground mt-1">Créez une nouvelle clé pour un client DMH.</p>
        </div>
      </div>

      {/* Toggle mode */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "single"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="h-4 w-4" />
          Poste unique
        </button>
        <button
          type="button"
          onClick={() => setMode("multi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "multi"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="h-4 w-4" />
          Multi-postes
          <Badge variant="secondary" className="ml-1 text-xs">max {MAX_POSTES}</Badge>
        </button>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(mode === "single" ? onSubmitSingle : () => {})}>
            <CardContent className="space-y-6 pt-6">

              {/* Produit + Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produit DMH</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un produit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRODUCT_NAMES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licenseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de licence</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(LICENSE_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ID Machine — poste unique */}
              {mode === "single" && (
                <FormField
                  control={form.control}
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Machine</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: a3f1b2c4d5e6f7a8..." className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>L'identifiant matériel unique du poste client.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* ID Machines — multi-postes */}
              {mode === "multi" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">ID Machines</p>
                    <p className="text-xs text-muted-foreground">
                      Entrez les identifiants des postes (1 à {MAX_POSTES}). Une clé sera générée par poste.
                    </p>
                  </div>
                  {machineIds.map((id, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted border text-xs font-bold shrink-0 text-muted-foreground">
                        {idx + 1}
                      </div>
                      <Input
                        placeholder={`ID Poste ${idx + 1} — ex: a3f1b2c4…`}
                        className="font-mono text-sm"
                        value={id}
                        onChange={(e) => {
                          const next = [...machineIds];
                          next[idx] = e.target.value;
                          setMachineIds(next);
                        }}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Laissez les champs vides si le client n'utilise pas tous les postes.
                  </p>
                </div>
              )}

              {/* Durée */}
              {licenseType !== "perpetual" && (
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée personnalisée (jours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={licenseType === "trial" ? "7 par défaut" : "30 par défaut"}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>Laissez vide pour la durée standard.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Client */}
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du client (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'entreprise" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes internes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Informations supplémentaires..." className="resize-none" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>

            <CardFooter className="bg-muted/50 py-4 px-6 border-t flex justify-end">
              {mode === "single" ? (
                <Button type="submit" disabled={generateLicense.isPending} className="w-full sm:w-auto">
                  {generateLicense.isPending ? "Génération en cours..." : "Générer la licence"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isGenerating || machineIds.every((id) => id.trim() === "")}
                  onClick={onSubmitMulti}
                  className="w-full sm:w-auto"
                >
                  {isGenerating
                    ? "Génération en cours..."
                    : `Générer ${machineIds.filter((id) => id.trim() !== "").length || ""} licence(s)`}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
