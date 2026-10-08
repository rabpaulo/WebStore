import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowsDownUp,
  CaretDown,
  ChartPieSlice,
  CirclesFour,
  ClipboardText,
  Cube,
  List,
  SignOut,
  Users,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { initials, roleLabel } from '../lib/format';
import { Button } from './ui';

const navigation = [
  { to: '/', label: 'Dashboard', icon: ChartPieSlice },
  { to: '/products', label: 'Produtos', icon: CirclesFour },
  { to: '/inventory', label: 'Estoque', icon: Cube },
  { to: '/orders', label: 'Pedidos', icon: ClipboardText },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/movements', label: 'Movimentações', icon: ArrowsDownUp },
];
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-mark">
        lf
        <span />
      </div>
      <div>
        <strong>
          Lingerie<span>Flow</span>
        </strong>
        {!compact && <small>GESTÃO DE VAREJO</small>}
      </div>
    </div>
  );
}
export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width:767px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width:767px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const section =
    navigation.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    )?.label ?? 'Usuários';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        inert={mobile && !mobileOpen}
        aria-hidden={mobile && !mobileOpen}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMobileOpen(false);
        }}
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
      >
        <div className="sidebar-brand">
          <Brand />
          <Button
            variant="ghost"
            className="mobile-close icon-button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">L</span>
          <div>
            <strong>Minha operação</strong>
            <small>Varejo de moda íntima</small>
          </div>
          <CaretDown size={14} />
        </div>
        <p className="nav-label">PRINCIPAL</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              to={to}
              end={to === '/'}
              key={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={21} weight="duotone" />
              <span>{label}</span>
            </NavLink>
          ))}
          {user?.role === 'ADMIN' && (
            <>
              <p className="nav-label nav-admin">ADMINISTRAÇÃO</p>
              <NavLink
                to="/users"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setMobileOpen(false)}
              >
                <UsersThree size={21} weight="duotone" />
                <span>Usuários</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <a
            className="help-link"
            href={`${import.meta.env.VITE_API_URL || '/api'}/docs`}
            target="_blank"
            rel="noreferrer"
          >
            <span>Documentação da API</span>
            <ArrowUpRight size={15} />
          </a>
          <div className="sidebar-user">
            <div className="avatar">{initials(user?.name ?? '')}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{roleLabel(user?.role ?? '')}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
            >
              <List size={22} />
            </Button>
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span />
              Operação conectada
            </span>
            <span className="topbar-divider" />
            <span className="avatar small">{initials(user?.name ?? '')}</span>
            <span>
              {user?.name.split(' ')[0]}
              <small className="topbar-role">{roleLabel(user?.role ?? '')}</small>
            </span>
            <button
              className="logout-button"
              aria-label="Sair"
              title="Sair da conta"
              onClick={handleLogout}
            >
              <SignOut size={20} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>LingerieFlow</span>
          <span>Seu estoque, em cada detalhe.</span>
        </footer>
      </div>
    </div>
  );
}
