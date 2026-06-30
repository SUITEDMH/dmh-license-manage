import { useState } from "react";
import { useListLicenses, useRevokeLicense, useRenewLicense, useDeleteLicense, getListLicensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, MoreHorizontal, ShieldAlert, RefreshCw, Trash2, Eye, PlusCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_NAMES, LICENSE_TYPES, formatDate } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";

export default function LicenseList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(productFilter !== "all" ? { product: productFilter } : {}),
    ...(typeFilter !== "all" ? { licenseType: typeFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: licenses, isLoading, isError } = useListLicenses(queryParams);
  const revokeLicense = useRevokeLicense();
  const renewLicense = useRenewLicense();
  const deleteLicense = useDeleteLicense();

  const handleRevoke = (id: number) => {
    revokeLicense.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Licence révoquée", description: "La licence a été désactivée avec succès." });
        queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
      },
      onError: () => toast({ variant: "destructive", title: "Erreur", description: "Impossible de révoquer la licence." })
    });
  };

  const handleRenew = (id: number) => {
    renewLicense.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Licence renouvelée", description: "L'abonnement a été prolongé de 30 jours." });
        queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
      },
      onError: () => toast({ variant: "destructive", title: "Erreur", description: "Impossible de renouveler la licence." })
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cette licence ?")) {
      deleteLicense.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Licence supprimée" });
          queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la licence." })
      });
    }
  };

  // ── Erreur de chargement ──────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Server className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground">Erreur de chargement</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-sm">
          Impossible de charger les licences. Le serveur est peut-être en train de démarrer.
        </p>
        <Button
          className="mt-6"
          onClick={() => queryClient.invalidateQueries({ queryKey: getListLicensesQueryKey() })}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Licences</h1>
          <p className="text-muted-foreground mt-1">Gérez toutes les licences générées.</p>
        </div>
        <Link href="/licenses/generate">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle licence
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher (Client, Clé, Machine)..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Produit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {Object.entries(PRODUCT_NAMES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(LICENSE_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expirée</SelectItem>
            <SelectItem value="revoked">Révoquée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clé / Machine</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Produit / Type</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : licenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aucune licence trouvée.
                </TableCell>
              </TableRow>
            ) : (
              licenses?.map((license) => {
                const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();
                
                return (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{license.licenseKey.substring(0, 16)}...</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={license.machineId}>
                        {license.machineId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{license.clientName || <span className="text-muted-foreground italic">Non spécifié</span>}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{PRODUCT_NAMES[license.product] || license.product}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{LICENSE_TYPES[license.licenseType] || license.licenseType}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm ${isExpired ? 'text-destructive font-medium' : 'text-foreground'}`}>
                        {formatDate(license.expiresAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!license.isActive ? (
                        <Badge variant="destructive" className="font-normal">Révoquée</Badge>
                      ) : isExpired ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-800 dark:text-amber-500 font-normal">Expirée</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-normal">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/licenses/${license.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
                          </Link>
                          {license.licenseType === "subscription" && license.isActive && (
                            <DropdownMenuItem 
                              className="cursor-pointer text-primary"
                              onClick={() => handleRenew(license.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Renouveler (30j)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {license.isActive && (
                            <DropdownMenuItem 
                              className="cursor-pointer text-amber-600 dark:text-amber-500 focus:text-amber-600 dark:focus:text-amber-500"
                              onClick={() => handleRevoke(license.id)}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              Révoquer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleDelete(license.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
git add artifacts/license-admin/src/pages/licenses/index.tsx
git commit -m "fix: gestion erreur API sur page licences (isError + bouton réessayer)"
git push
