import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/use-auth'
import { TenantProvider } from '@/hooks/use-tenant'
import { AuthGuard } from '@/components/AuthGuard'
import Layout from '@/components/Layout'

// Screens
import Login from './pages/Login'
import Index from './pages/Index'
import PatientsList from './pages/PatientsList'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import TeamsList from './pages/TeamsList'
import Invitations from './pages/Invitations'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              {/* Public Entry */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated & Multi-Tenant Protected Shell */}
              <Route
                element={
                  <AuthGuard>
                    <Layout />
                  </AuthGuard>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/pacientes" element={<PatientsList />} />
                <Route path="/pacientes/novo" element={<PatientForm />} />
                <Route path="/pacientes/:id" element={<PatientDetail />} />
                <Route path="/pacientes/:id/editar" element={<PatientForm />} />
                <Route path="/equipes" element={<TeamsList />} />
                <Route path="/equipes/:id" element={<TeamsList />} />
                <Route path="/convites" element={<Invitations />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/perfil" element={<Profile />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
