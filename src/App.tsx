import HUD from "./ui/HUD";
import Map from "./ui/Map";

export default function App() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Map />
      <HUD />
    </div>
  );
}
