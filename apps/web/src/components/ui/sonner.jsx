import { Toaster as Sonner } from 'sonner';

function Toaster(props) {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-2xl border-0 bg-inverse font-sans text-inverse-foreground shadow-pop',
          description: 'opacity-80',
          closeButton: 'border-0 bg-inverse text-inverse-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-transparent text-inverse-foreground'
        }
      }}
      {...props}
    />
  );
}

export { Toaster };
