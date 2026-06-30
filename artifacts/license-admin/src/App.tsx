import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import LicenseList from "@/pages/licenses/index";
import GenerateLicense from "@/pages/licenses/generate";
import LicenseDetail from "@/pages/licenses/detail";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(
  import.meta.env.VITE_API_BASE_URL ?? "https://dmh-license-api.onrender.com"
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/licenses/generate" component={() => <Layout><ProtectedRoute component={GenerateLicense} /></Layout>} />
      <Route path="/licenses/:id" component={() => <Layout><ProtectedRoute component={LicenseDetail} /></Layout>} />
      <Route path="/licenses" component={() => <Layout><ProtectedRoute component={LicenseList} /></Layout>} />
      <Route path="/" component={() => <Layout><ProtectedRoute component={Dashboard} /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base="">
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
