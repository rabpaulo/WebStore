import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Eye, EyeSlash, Stack } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { Brand } from '../components/Layout';
import { Button, Field } from '../components/ui';

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use no mínimo 8 caracteres.'),
});
export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  if (auth.user) return <Navigate to="/" replace />;
  const submit = form.handleSubmit(async (values) => {
    setError('');
    try {
      await auth.login(values.email, values.password);
      navigate('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível entrar.');
    }
  });
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-body">
          <span className="eyebrow">OPERAÇÃO EM HARMONIA</span>
          <h1>
            Cada variante.
            <br />
            Cada pedido.
            <br />
            <span>Tudo no lugar.</span>
          </h1>
          <p>
            Mais clareza para cuidar do estoque.
            <br />
            Mais tempo para cuidar do seu negócio.
          </p>
          <div className="login-capabilities">
            {[
              'Catálogo organizado por cor e tamanho',
              'Estoque com histórico completo',
              'Pedidos do início à entrega',
            ].map((text) => (
              <div key={text}>
                <Check size={17} />
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="login-story-foot">
          <Stack size={21} weight="duotone" />
          <span>Gestão pensada para o varejo de moda íntima.</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">BEM-VINDO AO LINGERIEFLOW</span>
          <h2>Entre na sua operação</h2>
          <p>Use suas credenciais para acessar o sistema.</p>
          <form onSubmit={submit}>
            <Field label="E-mail" error={form.formState.errors.email?.message}>
              <input
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                {...form.register('email')}
              />
            </Field>
            <Field label="Senha" error={form.formState.errors.password?.message}>
              <div className="password-input">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeSlash size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </Field>
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
            <Button className="full-width" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Entrando…' : 'Entrar no sistema'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <div className="demo-credentials">
            <strong>Conheça o sistema</strong>
            <p>Credenciais exclusivas de demonstração.</p>
            <div>
              <button
                type="button"
                onClick={() => {
                  form.setValue('email', 'admin@lingeriflow.local');
                  form.setValue('password', 'Admin123!');
                }}
              >
                Usar conta de administrador <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  form.setValue('email', 'vendedor@lingeriflow.local');
                  form.setValue('password', 'Seller123!');
                }}
              >
                Usar conta de vendedor <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
        <p className="login-footer">Projeto independente de portfólio · LingerieFlow</p>
      </section>
    </div>
  );
}
