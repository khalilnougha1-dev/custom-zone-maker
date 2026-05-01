import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CalculatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const inputDigit = (d: string) => {
    if (waiting) { setDisplay(d); setWaiting(false); }
    else setDisplay(display === "0" ? d : display + d);
  };
  const inputDot = () => {
    if (waiting) { setDisplay("0."); setWaiting(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  };
  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setWaiting(false); };
  const back = () => setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  const calc = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? 0 : a / b;
      case "%": return (a * b) / 100;
      default: return b;
    }
  };
  const setOperation = (next: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op && !waiting) {
      const r = calc(prev, cur, op);
      setDisplay(String(r));
      setPrev(r);
    } else setPrev(cur);
    setOp(next); setWaiting(true);
  };
  const equals = () => {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    setDisplay(String(calc(prev, cur, op)));
    setPrev(null); setOp(null); setWaiting(true);
  };

  const Btn = ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={cn(
      "h-14 rounded-xl font-bold text-lg transition active:scale-95",
      "bg-card border border-border hover:bg-muted text-foreground",
      className
    )}>{children}</button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="ltr">
        <DialogHeader>
          <DialogTitle className="text-center">الآلة الحاسبة</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl bg-black p-4 text-right font-mono text-3xl text-green-400 mb-3 overflow-hidden">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Btn onClick={clear} className="bg-destructive/10 text-destructive border-destructive/30">C</Btn>
          <Btn onClick={back}>⌫</Btn>
          <Btn onClick={() => setOperation("%")} className="bg-primary/10 text-primary">%</Btn>
          <Btn onClick={() => setOperation("÷")} className="bg-primary/10 text-primary">÷</Btn>
          <Btn onClick={() => inputDigit("7")}>7</Btn>
          <Btn onClick={() => inputDigit("8")}>8</Btn>
          <Btn onClick={() => inputDigit("9")}>9</Btn>
          <Btn onClick={() => setOperation("×")} className="bg-primary/10 text-primary">×</Btn>
          <Btn onClick={() => inputDigit("4")}>4</Btn>
          <Btn onClick={() => inputDigit("5")}>5</Btn>
          <Btn onClick={() => inputDigit("6")}>6</Btn>
          <Btn onClick={() => setOperation("-")} className="bg-primary/10 text-primary">-</Btn>
          <Btn onClick={() => inputDigit("1")}>1</Btn>
          <Btn onClick={() => inputDigit("2")}>2</Btn>
          <Btn onClick={() => inputDigit("3")}>3</Btn>
          <Btn onClick={() => setOperation("+")} className="bg-primary/10 text-primary">+</Btn>
          <Btn onClick={() => inputDigit("0")} className="col-span-2">0</Btn>
          <Btn onClick={inputDot}>.</Btn>
          <Btn onClick={equals} className="bg-gradient-primary text-primary-foreground">=</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
