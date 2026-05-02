import { Switch, Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

// Auth pages
import LoginPage        from '@/pages/auth/LoginPage';
import RegisterPage     from '@/pages/auth/RegisterPage';
import VerifyEmailPage  from '@/pages/auth/VerifyEmailPage';

// App pages
import DashboardPage    from '@/pages/DashboardPage';
import CustomersPage    from '@/pages/customers/CustomersPage';
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage';
import NewCustomerPage  from '@/pages/customers/NewCustomerPage';
import ProgramsPage     from '@/pages/programs/ProgramsPage';
import ProgramWizardPage from '@/pages/programs/ProgramWizardPage';
import EscalationsPage  from '@/pages/escalations/EscalationsPage';
import EscalationDetailPage from '@/pages/escalations/EscalationDetailPage';
import TasksPage        from '@/pages/TasksPage';
import AuditPage        from '@/pages/AuditPage';
import SettingsPage     from '@/pages/SettingsPage';
import MembersPage      from '@/pages/MembersPage';

// Landing
import LandingPage      from '@/pages/LandingPage';

// Layout
import AppLayout        from '@/components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) return <Redirect to="/login" />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthed) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Switch>
      {/* Landing */}
      <Route path="/" component={LandingPage} />

      {/* Public auth routes */}
      <Route path="/login">
        <PublicRoute><LoginPage /></PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute><RegisterPage /></PublicRoute>
      </Route>
      <Route path="/verify-email">
        <ProtectedRoute><VerifyEmailPage /></ProtectedRoute>
      </Route>

      {/* Protected app routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/customers/new">
        <ProtectedRoute>
          <AppLayout><NewCustomerPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/customers/:id">
        <ProtectedRoute>
          <AppLayout><CustomerDetailPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <AppLayout><CustomersPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/programs/:id/wizard">
        <ProtectedRoute>
          <AppLayout><ProgramWizardPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/programs">
        <ProtectedRoute>
          <AppLayout><ProgramsPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/escalations/:id">
        <ProtectedRoute>
          <AppLayout><EscalationDetailPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/escalations">
        <ProtectedRoute>
          <AppLayout><EscalationsPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/tasks">
        <ProtectedRoute>
          <AppLayout><TasksPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/audit">
        <ProtectedRoute>
          <AppLayout><AuditPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout><SettingsPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/members">
        <ProtectedRoute>
          <AppLayout><MembersPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}
