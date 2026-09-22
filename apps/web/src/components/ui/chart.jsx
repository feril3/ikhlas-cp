import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

const ChartContext = React.createContext({});

function ChartContainer({ config, className, children, ...props }) {
  const id = React.useId().replace(/:/g, '');
  const cssVariables = Object.entries(config ?? {}).reduce((acc, [key, item]) => {
    if (item?.color) acc[`--color-${key}`] = item.color;
    return acc;
  }, {});

  return (
    <ChartContext.Provider value={config ?? {}}>
      <div
        data-chart={id}
        className={cn('min-h-0 w-full text-xs text-muted-foreground', className)}
        style={cssVariables}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsTooltip;

function ChartTooltipContent({ active, payload, label, labelFormatter, formatter }) {
  const config = React.useContext(ChartContext);
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-md border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
      <div className="mb-2 font-semibold text-foreground">
        {labelFormatter ? labelFormatter(label, payload) : label}
      </div>
      <div className="flex flex-col gap-1.5">
        {payload.map((item) => {
          const key = item.dataKey ?? item.name;
          const entry = config[key] ?? {};
          return (
            <div className="flex items-center gap-2" key={String(key)}>
              <span className="size-2 rounded-[2px]" style={{ background: item.color }} />
              <span className="text-muted-foreground">{entry.label ?? item.name ?? key}</span>
              <strong className="ml-auto font-semibold text-foreground">
                {formatter ? formatter(item.value, item.name, item, payload) : item.value}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
