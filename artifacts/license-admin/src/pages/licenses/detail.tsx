import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetLicense, useUpdateLicense, useRevokeLicense, useRenewLicense, useDeleteLicense, getGetLicenseQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Shield, Laptop, User, Calendar, RefreshCw, ShieldAlert, Trash2, Save, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { PRODUCT_NAMES, LICENSE_TYPES, formatDateTime } from "@/lib/constants";

export default function LicenseDetail() {
  const { id } = useParams<{ id: string }>();
  const licenseId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: license, isLoading, isError } = useGetLicense(licenseId);
  const updateLicense = useUpdateLicense();
  const revokeLicense = useRevokeLicense();
  const renewLicense = useRenewLicense();
  const deleteLicense = useDeleteLicense();

  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  
  const debouncedClientName = useDebounce(clientName, 1000);
  const debouncedNotes = useDebounce(notes, 1000);
  
  const initRef = useRef<number | null>(null);
  const lastSavedRef = useRef({ clientName: "", notes: "" });

  useEffect(() => {
    if (license && initRef.current !== licenseId) {
      initRef.current = licenseId;
      setClientName(license.clientName || "");
      setNotes(license.notes || "");
      lastSavedRef.current = { 
        clientName: license.clientName || "", 
        notes: license.notes || "" 
      };
    }
  }, [license, licenseId]);

  useEffect(() => {
    if (initRef.current !== licenseId) return;
    
    if (debouncedClientName !== lastSavedRef.current.clientName || 
        debouncedNotes !== lastSavedRef.current.notes) {
      
      updateLicense.mutate(
        { id: licenseId, data: { clientName: debouncedClientName, notes: debouncedNotes } },
        {
          onSuccess: (data) => {
            lastSavedRef.current = { clientName: data.clientName || "", notes: data.notes || "" };
            queryClient.setQueryData(getGetLicenseQueryKey(licenseId), data);
            toast({ title: "Modifications enregistrées" });
          }
        }
      );
    }
  }, [debouncedClientName, debouncedNotes, licenseId, updateLicense, queryClient, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full mb-6" />
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !license) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold text-foreground">Licence introuvable</h2>
        <p className="text-muted-foreground mt-2">La licence demandée n'existe pas ou a été supprimée.</p>
        <Button className="mt-6" onClick={() => setLocation("/licenses")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/licenses")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">
                {license.licenseKey.substring(0, 16)}...
              </h1>
              {!license.isActive ? (
                <Badge variant="destructive" className="font-normal text-sm">Révoquée</Badge>
              ) : isExpired ? (
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-800 dark:text-amber-500 font-normal text-sm">Expirée</Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-normal text-sm">Active</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">Détails et gestion de la licence.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {license.licenseType === "subscription" && license.isActive && (
            <Button 
              variant="outline" 
              className="text-primary hover:text-primary hover:bg-primary/10"
              disabled={renewLicense.isPending}
              onClick={() => {
                renewLicense.mutate({ id: licenseId }, {
                  onSuccess: (data) => {
                    toast({ title: "Licence renouvelée", description: "L'abonnement a été prolongé de 30 jours." });
                    queryClient.setQueryData(getGetLicenseQueryKey(licenseId), data);
                  }
                });
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Renouveler
            </Button>
          )}
          {license.isActive && (
            <Button 
              variant="outline" 
              className="text-amber-600 hover:text-amber-600 hover:bg-amber-100 border-amber-200 dark:border-amber-900 dark:hover:bg-amber-900/30"
              disabled={revokeLicense.isPending}
              onClick={() => {
                if (confirm("Révoquer cette licence va la désactiver immédiatement. Continuer ?")) {
                  revokeLicense.mutate({ id: licenseId }, {
                    onSuccess: (data) => {
                      toast({ title: "Licence révoquée" });
                      queryClient.setQueryData(getGetLicenseQueryKey(licenseId), data);
                    }
                  });
                }
              }}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Révoquer
            </Button>
          )}
          <Button 
            variant="destructive"
            disabled={deleteLicense.isPending}
            onClick={() => {
              if (confirm("Supprimer définitivement cette licence ? Cette action est irréversible.")) {
                deleteLicense.mutate({ id: licenseId }, {
                  onSuccess: () => {
                    toast({ title: "Licence supprimée" });
                    setLocation("/licenses");
                  }
                });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Informations clés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                <div className="text-sm text-muted-foreground mb-1 font-medium">Clé complète</div>
                <div className="font-mono text-lg break-all selection:bg-primary/20">{license.licenseKey}</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Laptop className="w-4 h-4 mr-2" />
                    Machine ID
                  </div>
                  <div className="font-mono font-medium truncate" title={license.machineId}>{license.machineId}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 mr-2" />
                    Produit
                  </div>
                  <div className="font-medium">{PRODUCT_NAMES[license.product] || license.product}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    Type
                  </div>
                  <div className="font-medium">{LICENSE_TYPES[license.licenseType] || license.licenseType}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Expiration
                  </div>
                  <div className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                    {formatDateTime(license.expiresAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Détails modifiables</CardTitle>
              <CardDescription>Les modifications sont enregistrées automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center text-foreground">
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  Client
                </label>
                <Input 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  placeholder="Nom de l'entreprise ou contact"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center text-foreground">
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                  Notes internes
                </label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Informations supplémentaires, historique des paiements..."
                  className="min-h-[120px] resize-y"
                />
              </div>
              
              <div className="flex items-center justify-end text-xs text-muted-foreground pt-2">
                {(debouncedClientName !== lastSavedRef.current.clientName || debouncedNotes !== lastSavedRef.current.notes) && updateLicense.isPending ? (
                  <span className="flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Enregistrement...</span>
                ) : (
                  <span className="flex items-center"><Save className="w-3 h-3 mr-1" /> Enregistré</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Création</span>
                <span className="font-medium">{formatDateTime(license.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Dernière modif.</span>
                <span className="font-medium">{formatDateTime(license.updatedAt || license.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
