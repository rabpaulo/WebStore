import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { EmptyState, ErrorState, LoadingState } from './components/ui';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { UsersPage } from './pages/UsersPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { MovementsPage } from './pages/MovementsPage';
import { LoginPage } from './pages/LoginPage';

function PrivateRoute() {
  const auth = useAuth();
  if (auth.loading) return <LoadingState />;
  if (auth.error) return <ErrorState error={auth.error} retry={auth.retry} />;
  return auth.user ? <Outlet /> : <Navigate to="/login" replace />;
}
function AdminRoute() {
  return useAuth().user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route element={<AdminRoute />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="movements" element={<MovementsPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="Página não encontrada"
                description="Use o menu para voltar à sua operação."
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
