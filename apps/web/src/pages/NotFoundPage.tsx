import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-5xl font-bold text-slate-200">404</h1>
      <p className="text-slate-500">Page not found</p>
      <button
        onClick={() => navigate(-1)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Go back
      </button>
    </div>
  );
}
