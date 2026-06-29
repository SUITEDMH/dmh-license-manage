import { useGetLicenseStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { PlusCircle, Activity, Key, XCircle, Clock, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_NAMES, LICENSE_TYPES, formatDate } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetLicenseStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Server className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground">Erreur de chargement</h2>
        <p className="text-muted-foreground mt-2">Impossible de charger les statistiques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble des licences DMH Suite.
          </p>
        </div>
        <Link href="/licenses/generate" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Générer une licence
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Licences</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actives</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expirées</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Révoquées</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Licences Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentLicenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune licence générée récemment.
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentLicenses.map((license) => (
                  <Link key={license.id} href={`/licenses/${license.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group">
                      <div>
                        <div className="font-mono text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {license.licenseKey.substring(0, 16)}...
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-medium text-foreground/80">{PRODUCT_NAMES[license.product] || license.product}</span>
                          <span>•</span>
                          <span>{license.clientName || 'Client inconnu'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-normal text-xs">
                          {LICENSE_TYPES[license.licenseType] || license.licenseType}
                        </Badge>
                        {license.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-normal">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="font-normal">Inactiva</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Par Produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byProduct.map((bp) => (
                  <div key={bp.product} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{PRODUCT_NAMES[bp.product] || bp.product}</span>
                    <span className="font-medium">{bp.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Par Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Perpétuel</span>
                  <span className="font-medium">{stats.perpetual}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Abonnement</span>
                  <span className="font-medium">{stats.subscription}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Essai</span>
                  <span className="font-medium">{stats.trial}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
