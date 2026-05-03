import { Switch, Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { OnboardingTour } from '@/components/OnboardingTour';

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
import BillingPage      from '@/pages/billing/BillingPage';
import DocumentsPage    from '@/pages/documents/DocumentsPage';
import AdminPage        from '@/pages/admin/AdminPage';
import TrainingPage     from '@/pages/training/TrainingPage';
import AlertsPage       from '@/pages/alerts/AlertsPage';
import ReviewsPage          from '@/pages/reviews/ReviewsPage';
import RiskIntelligencePage from '@/pages/risk/RiskIntelligencePage';
import AnalyticsPage        from '@/pages/analytics/AnalyticsPage';
import ProvidersPage        from '@/pages/providers/ProvidersPage';
import ApiGatewayPage        from '@/pages/gateway/ApiGatewayPage';
import WhiteLabelPage        from '@/pages/whitelabel/WhiteLabelPage';
import GroupWorkspacesPage   from '@/pages/groups/GroupWorkspacesPage';

// Diamond features
import ComplianceHealthPage  from '@/pages/compliance/ComplianceHealthPage';
import ComplianceCalendarPage from '@/pages/compliance/ComplianceCalendarPage';
import TransactionMonitoringPage from '@/pages/compliance/TransactionMonitoringPage';

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
    <>
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

      <Route path="/billing">
        <ProtectedRoute>
          <AppLayout><BillingPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/documents">
        <ProtectedRoute>
          <AppLayout><DocumentsPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute>
          <AppLayout><AdminPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/training">
        <ProtectedRoute>
          <AppLayout><TrainingPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/alerts">
        <ProtectedRoute>
          <AppLayout><AlertsPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reviews">
        <ProtectedRoute>
          <AppLayout><ReviewsPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/risk">
        <ProtectedRoute>
          <AppLayout><RiskIntelligencePage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <AppLayout><AnalyticsPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/providers">
        <ProtectedRoute>
          <AppLayout><ProvidersPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/gateway">
        <ProtectedRoute>
          <AppLayout><ApiGatewayPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/whitelabel">
        <ProtectedRoute>
          <AppLayout><WhiteLabelPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/groups">
        <ProtectedRoute>
          <AppLayout><GroupWorkspacesPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Diamond compliance features */}
      <Route path="/compliance-health">
        <ProtectedRoute>
          <AppLayout><ComplianceHealthPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute>
          <AppLayout><ComplianceCalendarPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/monitoring">
        <ProtectedRoute>
          <AppLayout><TransactionMonitoringPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route><Redirect to="/" /></Route>
    </Switch>
    <OnboardingTour />
    </>
  );
}
