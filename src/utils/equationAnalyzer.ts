import * as math from 'mathjs';

export type EquationType = 'explicit' | 'implicit' | 'parametric' | 'recurrence' | 'invalid';

export interface EquationInfo {
  type: EquationType;
  parsedExpr: string;
  parameters?: string[];
}

export function normalizeEquation(equation: string): string {
  if (!equation) return '';
  let s = equation
    .trim()
    .replace(/π/g, 'pi')
    .replace(/·/g, '*');

  // Add explicit multiplication for typical missing * cases
  s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2'); // 2pi -> 2*pi
  s = s.replace(/\b(pi|e)(?!(?:xp|rf|xpm1))([a-zA-Z\d])/g, '$1*$2'); // pi55 -> pi*55
  s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2'); // 55t -> 55*t
  
  // Handle e^2x -> e^(2*x)
  s = s.replace(/e\^(\d+\*[a-zA-Z]+)(?!\))/g, 'e^($1)');
  
  // pi( -> pi*(
  s = s.replace(/pi\s*\(/g, 'pi*(');
  
  return s;
}

export function analyzeEquation(equation: string): EquationInfo {
  if (!equation || equation.trim() === '') {
    return { type: 'invalid', parsedExpr: '', parameters: [] };
  }
  
  const normalized = normalizeEquation(equation)
    // Convert f(x)= or y(t)= to just the right side, but leave recurrence alone
    .replace(/^[a-zA-Z]\([a-zA-Z]\)\s*=/g, '');
    
  const trimmed = normalized.trim();
  
  let type: EquationType = 'explicit';
  let parsedExpr = trimmed;

  // 1. Parametric
  // e.g. [sin(t), cos(t)]
  if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.includes('t')) {
    type = 'parametric';
    parsedExpr = trimmed;
  }
  // 2. Recurrence
  // e.g. x(n+1) = r * x(n) * (1 - x(n))
  else if (trimmed.includes('n+') || trimmed.includes('n -') || trimmed.includes('x(n)') || trimmed.includes('y(n)')) {
    if (trimmed.includes('=')) {
      const parts = trimmed.split('=');
      if (parts.length === 2 && (parts[0].includes('n') || parts[0].includes('t'))) {
        type = 'recurrence';
        parsedExpr = parts[1].trim();
      }
    }
  }
  // 3. Implicit
  // e.g. x^2 + y^2 = 25
  else if (trimmed.includes('=')) {
    const parts = trimmed.split('=');
    if (parts.length === 2) {
      type = 'implicit';
      parsedExpr = `(${parts[0]}) - (${parts[1]})`;
    }
  }
  
  // Extract parameters
  let parameters: string[] = [];
  try {
    const node = math.parse(parsedExpr);
    const vars = new Set<string>();
    node.filter((n: any) => n.isSymbolNode).forEach((n: any) => vars.add(n.name));
    
    const coreVars = new Set(['x', 'y', 't', 'n', 'e', 'pi', 'i']);
    parameters = Array.from(vars).filter(v => !coreVars.has(v) && typeof (math as any)[v] !== 'function');
    
    if (type === 'recurrence') {
      parameters.push('x0');
      // If it looks like a 2D map, maybe add y0? For now just x0.
    }
  } catch (e) {
    // Mathjs parse error, ignore parameters
  }

  return { type, parsedExpr, parameters };
}
