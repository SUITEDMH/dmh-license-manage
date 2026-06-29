import { useState } from "react";
import { useLocation } from "wouter";
import { useGenerateLicense, getListLicensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, ArrowLeft, Key } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_NAMES, LICENSE_TYPES } from "@/lib/constants";

const generateSchema = z.object({
  machineId: z.string().min(1, "L'ID de la machine est requis"),
  product: z.string().min(1, "Sélectionnez un produit"),
  licenseType: z.string().min(1, "Sélectionnez un type de licence"),
  durationDays: z.coerce.number().optional().nullable(),
  clientName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type GenerateValues = z.infer<typeof generateSchema>;

export default function GenerateLicense() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateLicense = useGenerateLicense();
  
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

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

  const onSubmit = (values: GenerateValues) => {
    generateLicense.mutate({ data: values }, {
      onSuccess: (data) => {
        setGeneratedKey(data.licenseKey);
        toast({ title: "Licence générée avec succès" });
        queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
      },
      onError: (error) => {
        toast({ 
          variant: "destructive", 
          title: "Erreur lors de la génération", 
          description: "Vérifiez les informations fournies."
        });
      }
    });
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      toast({ title: "Clé copiée dans le presse-papiers" });
    }
  };

  if (generatedKey) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        <Button variant="ghost" onClick={() => setLocation("/licenses")} className="-ml-4 mb-4 text-muted-foreground hover:text-foreground">
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
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg border flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Clé de licence</div>
              <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-foreground break-all text-center selection:bg-primary/20">
                {generatedKey}
              </div>
              
              <Button 
                onClick={handleCopy}
                className="mt-6 w-full sm:w-auto"
                size="lg"
                variant={hasCopied ? "secondary" : "default"}
              >
                {hasCopied ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    Copier la clé
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-10">
            <Button variant="outline" onClick={() => setLocation("/licenses")}>
              Voir toutes les licences
            </Button>
            <Button className="ml-4" onClick={() => {
              setGeneratedKey(null);
              form.reset();
            }}>
              Générer une autre
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/licenses")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Générer une licence</h1>
          <p className="text-muted-foreground mt-1">Créez une nouvelle clé pour un client DMH.</p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              
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

              <FormField
                control={form.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Machine</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: 1A2B3C4D5E6F" className="font-mono text-sm" {...field} />
                    </FormControl>
                    <FormDescription>L'identifiant matériel unique du serveur du client.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {licenseType !== "perpetual" && (
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée personnalisée (Jours)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={licenseType === "trial" ? "7 par défaut" : "30 par défaut"} {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Laissez vide pour utiliser la durée standard.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du client (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'entreprise" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes internes (Optionnel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informations supplémentaires..." 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 px-6 border-t flex justify-end">
              <Button type="submit" disabled={generateLicense.isPending} className="w-full sm:w-auto">
                {generateLicense.isPending ? "Génération en cours..." : "Générer la licence"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
