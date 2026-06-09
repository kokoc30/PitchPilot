import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="flex min-h-[58vh] items-center justify-center">
      <Card className="max-w-lg text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">404</p>
        <h1 className="mt-3 text-[28px] font-medium tracking-[-0.022em] text-ink-0">Page not found</h1>
        <p className="mt-2 text-[13px] leading-[1.55] text-ink-2">
          The page you're looking for doesn't exist.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Return home
        </Button>
      </Card>
    </section>
  );
}
