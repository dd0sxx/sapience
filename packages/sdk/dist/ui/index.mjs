import {
  reducer,
  toast,
  useToast
} from "../chunk-NRTWAEDO.mjs";

// ui/hooks/use-mobile.tsx
import * as React2 from "react";
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React2.useState(void 0);
  React2.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
function useIsBelow(breakpoint) {
  const [isBelow, setIsBelow] = React2.useState(void 0);
  React2.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsBelow(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsBelow(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return !!isBelow;
}

// ui/hooks/useLiquidityForm.ts
import { useForm } from "react-hook-form";
function useLiquidityForm({
  lowPrice = "0",
  highPrice = "0"
} = {}) {
  const form = useForm({
    defaultValues: {
      depositAmount: "0",
      lowPrice,
      highPrice,
      slippage: "0.5"
    }
  });
  form.register("depositAmount", {
    required: "Deposit amount is required"
  });
  form.register("lowPrice", {
    required: "Low price is required"
  });
  form.register("highPrice", {
    required: "High price is required"
  });
  function onSubmit(data) {
    console.log("Liquidity form submission:", data);
  }
  return {
    ...form,
    onSubmit
  };
}

// ui/hooks/useTradeForm.ts
import { useForm as useForm2 } from "react-hook-form";
function useTradeForm() {
  const form = useForm2({
    defaultValues: {
      size: "0",
      slippage: "0.5",
      direction: "Long"
    }
  });
  form.register("size", {
    required: "Size is required"
  });
  form.register("direction", {
    required: "Direction is required"
  });
  function onSubmit(data) {
    console.log("Trade form submission:", data);
  }
  return {
    ...form,
    onSubmit
  };
}

// ui/components/ui/button.tsx
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React3 from "react";

// ui/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ui/components/ui/button.tsx
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        xs: "h-7 rounded-md px-2 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
var Button = React3.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ React3.createElement(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

// ui/components/ui/form.tsx
import { Slot as Slot2 } from "@radix-ui/react-slot";
import * as React5 from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";

// ui/components/ui/label.tsx
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva as cva2 } from "class-variance-authority";
import * as React4 from "react";
var labelVariants = cva2(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
var Label = React4.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React4.createElement(
  LabelPrimitive.Root,
  {
    ref,
    className: cn(labelVariants(), className),
    ...props
  }
));
Label.displayName = LabelPrimitive.Root.displayName;

// ui/components/ui/form.tsx
var Form = FormProvider;
var FormFieldContext = React5.createContext(
  {}
);
var FormField = ({
  ...props
}) => {
  return /* @__PURE__ */ React5.createElement(FormFieldContext.Provider, { value: { name: props.name } }, /* @__PURE__ */ React5.createElement(Controller, { ...props }));
};
var useFormField = () => {
  const fieldContext = React5.useContext(FormFieldContext);
  const itemContext = React5.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState
  };
};
var FormItemContext = React5.createContext(
  {}
);
var FormItem = React5.forwardRef(({ className, ...props }, ref) => {
  const id = React5.useId();
  return /* @__PURE__ */ React5.createElement(FormItemContext.Provider, { value: { id } }, /* @__PURE__ */ React5.createElement("div", { ref, className: cn("space-y-2", className), ...props }));
});
FormItem.displayName = "FormItem";
var FormLabel = React5.forwardRef(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return /* @__PURE__ */ React5.createElement(
    Label,
    {
      ref,
      className: cn(error && "text-destructive", className),
      htmlFor: formItemId,
      ...props
    }
  );
});
FormLabel.displayName = "FormLabel";
var FormControl = React5.forwardRef(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return /* @__PURE__ */ React5.createElement(
    Slot2,
    {
      ref,
      id: formItemId,
      "aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
      "aria-invalid": !!error,
      ...props
    }
  );
});
FormControl.displayName = "FormControl";
var FormDescription = React5.forwardRef(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return /* @__PURE__ */ React5.createElement(
    "p",
    {
      ref,
      id: formDescriptionId,
      className: cn("text-sm text-muted-foreground", className),
      ...props
    }
  );
});
FormDescription.displayName = "FormDescription";
var FormMessage = React5.forwardRef(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;
  if (!body) {
    return null;
  }
  return /* @__PURE__ */ React5.createElement(
    "p",
    {
      ref,
      id: formMessageId,
      className: cn("text-sm font-medium text-destructive", className),
      ...props
    },
    body
  );
});
FormMessage.displayName = "FormMessage";

// ui/components/ui/input.tsx
import * as React6 from "react";
import { cva as cva3 } from "class-variance-authority";
var inputVariants = cva3(
  "flex w-full rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      inputSize: {
        default: "h-10 px-3 py-2 text-sm",
        sm: "h-9 px-3 py-1.5 text-sm",
        xs: "h-7 px-2 py-1 text-xs",
        lg: "h-11 px-4 py-3 text-base"
      }
    },
    defaultVariants: {
      inputSize: "default"
    }
  }
);
var Input = React6.forwardRef(
  ({ className, type, endAdornment, inputSize, ...props }, ref) => {
    return /* @__PURE__ */ React6.createElement("div", { className: "relative flex items-center w-full" }, /* @__PURE__ */ React6.createElement(
      "input",
      {
        type,
        className: cn(inputVariants({ inputSize }), "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground", className),
        ref,
        ...props
      }
    ), endAdornment && /* @__PURE__ */ React6.createElement("div", { className: "absolute right-0" }, endAdornment));
  }
);
Input.displayName = "Input";

// ui/components/ui/select.tsx
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React7 from "react";
var Select = SelectPrimitive.Root;
var SelectGroup = SelectPrimitive.Group;
var SelectValue = SelectPrimitive.Value;
var SelectTrigger = React7.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props
  },
  children,
  /* @__PURE__ */ React7.createElement(SelectPrimitive.Icon, { asChild: true }, /* @__PURE__ */ React7.createElement(ChevronDown, { className: "h-4 w-4 opacity-50" }))
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
var SelectScrollUpButton = React7.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.ScrollUpButton,
  {
    ref,
    className: cn(
      "flex cursor-default items-center justify-center py-1",
      className
    ),
    ...props
  },
  /* @__PURE__ */ React7.createElement(ChevronUp, { className: "h-4 w-4" })
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
var SelectScrollDownButton = React7.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.ScrollDownButton,
  {
    ref,
    className: cn(
      "flex cursor-default items-center justify-center py-1",
      className
    ),
    ...props
  },
  /* @__PURE__ */ React7.createElement(ChevronDown, { className: "h-4 w-4" })
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
var SelectContent = React7.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ React7.createElement(SelectPrimitive.Portal, null, /* @__PURE__ */ React7.createElement(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props
  },
  /* @__PURE__ */ React7.createElement(SelectScrollUpButton, null),
  /* @__PURE__ */ React7.createElement(
    SelectPrimitive.Viewport,
    {
      className: cn(
        "p-1",
        position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
      )
    },
    children
  ),
  /* @__PURE__ */ React7.createElement(SelectScrollDownButton, null)
)));
SelectContent.displayName = SelectPrimitive.Content.displayName;
var SelectLabel = React7.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.Label,
  {
    ref,
    className: cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
var SelectItem = React7.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props
  },
  /* @__PURE__ */ React7.createElement("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center" }, /* @__PURE__ */ React7.createElement(SelectPrimitive.ItemIndicator, null, /* @__PURE__ */ React7.createElement(Check, { className: "h-4 w-4" }))),
  /* @__PURE__ */ React7.createElement(SelectPrimitive.ItemText, null, children)
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
var SelectSeparator = React7.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React7.createElement(
  SelectPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// ui/components/ui/tabs.tsx
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React8 from "react";
import { cva as cva4 } from "class-variance-authority";
var Tabs = TabsPrimitive.Root;
var tabsListVariants = cva4(
  "inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground",
  {
    variants: {
      size: {
        default: "h-10 p-1",
        sm: "h-8 p-1"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);
var TabsList = React8.forwardRef(({ className, size, ...props }, ref) => /* @__PURE__ */ React8.createElement(
  TabsPrimitive.List,
  {
    ref,
    className: cn(tabsListVariants({ size }), className),
    ...props
  }
));
TabsList.displayName = TabsPrimitive.List.displayName;
var tabsTriggerVariants = cva4(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  {
    variants: {
      size: {
        default: "px-3 py-1.5 text-sm",
        sm: "px-2 py-1 text-xs"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);
var TabsTrigger = React8.forwardRef(({ className, size, ...props }, ref) => /* @__PURE__ */ React8.createElement(
  TabsPrimitive.Trigger,
  {
    ref,
    className: cn(tabsTriggerVariants({ size }), className),
    ...props
  }
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
var TabsContent = React8.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ React8.createElement(
  TabsPrimitive.Content,
  {
    ref,
    className: cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    ),
    ...props
  }
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ui/components/ui/tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React9 from "react";
function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = React9.useState(false);
  React9.useEffect(() => {
    try {
      const hasTouch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 || typeof window !== "undefined" && "ontouchstart" in window || typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      setIsCoarse(!!hasTouch);
    } catch (_e) {
      setIsCoarse(false);
    }
  }, []);
  return isCoarse;
}
var TooltipProvider = TooltipPrimitive.Provider;
var TooltipVariantContext = React9.createContext(null);
var Tooltip = ({
  children,
  delayDuration = 0,
  forceTooltipOnTouch = false,
  open,
  defaultOpen,
  onOpenChange,
  ..._props
}) => {
  const isCoarse = useIsCoarsePointer();
  const usePopover = isCoarse && !forceTooltipOnTouch;
  const variant = usePopover ? "popover" : "tooltip";
  const root = usePopover ? /* @__PURE__ */ React9.createElement(PopoverPrimitive.Root, { open, defaultOpen, onOpenChange }, children) : /* @__PURE__ */ React9.createElement(
    TooltipPrimitive.Root,
    {
      delayDuration,
      open,
      defaultOpen,
      onOpenChange
    },
    children
  );
  return /* @__PURE__ */ React9.createElement(TooltipVariantContext.Provider, { value: variant }, root);
};
var TooltipTrigger = React9.forwardRef(({ children, ...props }, ref) => {
  const variant = React9.useContext(TooltipVariantContext);
  if (variant === "popover") {
    return /* @__PURE__ */ React9.createElement(PopoverPrimitive.Trigger, { ref, ...props }, children);
  }
  return /* @__PURE__ */ React9.createElement(TooltipPrimitive.Trigger, { ref, ...props }, children);
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;
var TooltipContent = React9.forwardRef(({ className, side = "top", align, sideOffset = 4, ...props }, ref) => {
  const variant = React9.useContext(TooltipVariantContext);
  const contentClasses = cn(
    "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    className
  );
  if (variant === "popover") {
    return /* @__PURE__ */ React9.createElement(PopoverPrimitive.Portal, null, /* @__PURE__ */ React9.createElement(
      PopoverPrimitive.Content,
      {
        ref,
        side,
        align,
        sideOffset,
        collisionPadding: 8,
        className: cn(
          // Content-hugging width; allow wrapping
          "inline-block w-auto break-words whitespace-normal",
          contentClasses
        ),
        style: {
          maxWidth: "min(88dvw, 280px)",
          ...props?.style
        },
        ...props
      }
    ));
  }
  return /* @__PURE__ */ React9.createElement(TooltipPrimitive.Portal, null, /* @__PURE__ */ React9.createElement(
    TooltipPrimitive.Content,
    {
      ref,
      side,
      align,
      sideOffset,
      className: contentClasses,
      ...props
    }
  ));
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// ui/components/ui/textarea.tsx
import * as React10 from "react";
var Textarea = React10.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ React10.createElement(
    "textarea",
    {
      className: cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ref,
      ...props
    }
  );
});
Textarea.displayName = "Textarea";

// ui/components/TradeForm.tsx
import { useState as useState3, useEffect as useEffect3 } from "react";

// ui/components/SlippageTolerance.tsx
import { InfoIcon } from "lucide-react";
import { useFormContext as useFormContext2 } from "react-hook-form";
var SlippageTolerance = () => {
  const { setValue, watch } = useFormContext2();
  const currentSlippage = watch("slippage");
  const handleSlippageChange = (value, e) => {
    e.preventDefault();
    setValue("slippage", value.toString(), {
      shouldValidate: false
    });
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Label,
    {
      className: "flex items-center",
      onClick: (e) => e.preventDefault()
    },
    "Slippage Tolerance",
    /* @__PURE__ */ React.createElement(TooltipProvider, null, /* @__PURE__ */ React.createElement(Tooltip, null, /* @__PURE__ */ React.createElement(TooltipTrigger, { className: "cursor-default" }, /* @__PURE__ */ React.createElement(InfoIcon, { className: "md:ml-1 inline-block h-3 md:h-4 opacity-60 hover:opacity-80" })), /* @__PURE__ */ React.createElement(TooltipContent, { className: "max-w-md text-center p-3 font-normal" }, "Your slippage tolerance sets a maximum limit on how much additional collateral can be used or the minimum amount you will receive back, protecting you from unexpected market changes.")))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mt-2" }, /* @__PURE__ */ React.createElement(
    Button,
    {
      type: "button",
      onClick: (e) => handleSlippageChange(0.1, e),
      variant: Number(currentSlippage) === 0.1 ? "default" : "outline",
      size: "xs"
    },
    "0.1%"
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      type: "button",
      onClick: (e) => handleSlippageChange(0.5, e),
      variant: Number(currentSlippage) === 0.5 ? "default" : "outline",
      size: "xs"
    },
    "0.5%"
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      type: "button",
      onClick: (e) => handleSlippageChange(1, e),
      variant: Number(currentSlippage) === 1 ? "default" : "outline",
      size: "xs"
    },
    "1.0%"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement(
    Input,
    {
      value: currentSlippage,
      onChange: (e) => handleSlippageChange(Number(e.target.value), e),
      min: 0,
      max: 100,
      step: 0.1,
      type: "number",
      inputSize: "xs",
      endAdornment: /* @__PURE__ */ React.createElement("span", { className: "pr-2 text-xs text-gray-500" }, "%"),
      className: "pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    }
  ))));
};

// ui/components/NumberDisplay.tsx
import { Minus } from "lucide-react";
var NumberDisplay = ({
  value,
  precision = 4,
  padZeros = false
}) => {
  const formatNumber = (val) => {
    let numValue;
    if (typeof val === "bigint") {
      numValue = Number(val) / 10 ** 18;
    } else if (typeof val === "number") {
      numValue = val;
    } else if (typeof val === "string") {
      numValue = parseFloat(val);
    } else {
      return "Invalid input";
    }
    if (isNaN(numValue)) {
      return "Invalid number";
    }
    if (Math.abs(numValue) < 1 / 10 ** precision && numValue !== 0) {
      return `<${1 / 10 ** precision}`;
    }
    const factor = 10 ** precision;
    const roundedValue = Math.floor(numValue * factor) / factor;
    return padZeros ? roundedValue.toFixed(precision) : roundedValue.toString();
  };
  const displayValue = formatNumber(value || 0);
  const tooltipValue = typeof value === "bigint" ? (Number(value) / 10 ** 18).toString() : value?.toString() || "0";
  if (!displayValue.length) {
    return /* @__PURE__ */ React.createElement(Minus, { className: "opacity-20" });
  }
  if (displayValue === tooltipValue) {
    return /* @__PURE__ */ React.createElement("span", { className: "cursor-default" }, displayValue);
  }
  return /* @__PURE__ */ React.createElement(TooltipProvider, null, /* @__PURE__ */ React.createElement(Tooltip, null, /* @__PURE__ */ React.createElement(TooltipTrigger, { type: "button", className: "cursor-default" }, displayValue), /* @__PURE__ */ React.createElement(TooltipContent, { className: "font-normal" }, tooltipValue)));
};

// ui/components/TradeForm.tsx
var COLLATERAL_DECIMALS = 18;
function TradeForm({
  onTradeSubmit,
  collateralAssetTicker = "sUSDS",
  walletBalanceDisplay = "0.0",
  initialDirection = "Long",
  initialSize = "",
  initialSlippage = 0.5,
  getEstimatedCost,
  isLoading = false,
  isApproving = false,
  needsApproval = false,
  submitError = null
}) {
  const form = useTradeForm();
  const { toast: toast2 } = useToast();
  const { handleSubmit, control, watch, setValue, formState, reset } = form;
  const { isValid, isDirty, isSubmitting } = formState;
  useEffect3(() => {
    reset({
      direction: initialDirection,
      size: initialSize,
      slippage: String(initialSlippage)
    });
  }, [reset, initialDirection, initialSize, initialSlippage]);
  const size = watch("size");
  const direction = watch("direction");
  const slippage = watch("slippage");
  const [estimatedCollateralCost, setEstimatedCollateralCost] = useState3("0");
  const [isPreviewLoading, setIsPreviewLoading] = useState3(false);
  const slippageValue = parseFloat(slippage || "-1");
  useEffect3(() => {
    const sizeNum = parseFloat(size || "0");
    if (!size || sizeNum === 0 || !getEstimatedCost) {
      const mockCost = (sizeNum * 1.2).toFixed(COLLATERAL_DECIMALS);
      setEstimatedCollateralCost(mockCost);
      return;
    }
    let isMounted = true;
    const fetchCost = async () => {
      setIsPreviewLoading(true);
      try {
        const cost = await getEstimatedCost(size, direction);
        if (isMounted) {
          setEstimatedCollateralCost(cost);
        }
      } catch (error) {
        console.error("Error fetching estimated cost:", error);
        if (isMounted) {
          setEstimatedCollateralCost("0");
        }
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false);
        }
      }
    };
    fetchCost();
    return () => {
      isMounted = false;
    };
  }, [size, direction, getEstimatedCost]);
  const estimatedResultingBalance = (parseFloat(walletBalanceDisplay) - parseFloat(estimatedCollateralCost)).toFixed(COLLATERAL_DECIMALS);
  const handleFormSubmit = async (data) => {
    console.log("TradeForm submitting data:", data);
    try {
      await onTradeSubmit(data);
    } catch (error) {
      console.error("Error during onTradeSubmit call:", error);
      toast2({
        title: "Submission Failed",
        description: "An error occurred while submitting the trade.",
        variant: "destructive"
      });
    }
  };
  const handleDirectionChange = (value) => {
    setValue("direction", value, { shouldValidate: true });
  };
  let buttonText = "Submit Trade";
  if (needsApproval) buttonText = "Approve";
  if (isApproving) buttonText = "Approving...";
  else if (isLoading || isSubmitting) buttonText = "Submitting...";
  const isButtonDisabled = isLoading || isApproving || isSubmitting || !isValid || !isDirty || parseFloat(size || "0") <= 0 || slippageValue < 0;
  return /* @__PURE__ */ React.createElement(Form, { ...form }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit(handleFormSubmit), className: "space-y-4" }, /* @__PURE__ */ React.createElement(
    Tabs,
    {
      defaultValue: initialDirection,
      value: direction,
      onValueChange: handleDirectionChange,
      className: "mb-4"
    },
    /* @__PURE__ */ React.createElement(TabsList, { className: "grid w-full grid-cols-2" }, /* @__PURE__ */ React.createElement(TabsTrigger, { value: "Long" }, "Long"), /* @__PURE__ */ React.createElement(TabsTrigger, { value: "Short" }, "Short"))
  ), /* @__PURE__ */ React.createElement(
    FormField,
    {
      control,
      name: "size",
      render: ({ field }) => /* @__PURE__ */ React.createElement(FormItem, null, /* @__PURE__ */ React.createElement(FormLabel, null, "Size"), /* @__PURE__ */ React.createElement(FormControl, null, /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
        Input,
        {
          placeholder: "0.0",
          type: "number",
          step: "any",
          ...field,
          onChange: (e) => {
            field.onChange(e.target.value);
          }
        }
      ))), /* @__PURE__ */ React.createElement(FormMessage, null))
    }
  ), /* @__PURE__ */ React.createElement(SlippageTolerance, null), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end" }, /* @__PURE__ */ React.createElement(
    Button,
    {
      type: "submit",
      className: "w-full",
      disabled: isButtonDisabled
    },
    buttonText
  )), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4 mt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-medium mb-2" }, "Preview"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 text-sm" }, submitError && /* @__PURE__ */ React.createElement("p", { className: "text-red-500" }, "Error: ", submitError.message), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-muted-foreground" }, "Wallet Balance"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(NumberDisplay, { value: walletBalanceDisplay }), " ", collateralAssetTicker)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-muted-foreground" }, "Est. Cost ", isPreviewLoading ? "(Loading...)" : ""), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(NumberDisplay, { value: estimatedCollateralCost }), " ", collateralAssetTicker)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-muted-foreground" }, "Est. Resulting Balance"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(NumberDisplay, { value: estimatedResultingBalance }), " ", collateralAssetTicker)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-muted-foreground" }, "Slippage Tolerance"), /* @__PURE__ */ React.createElement("span", null, slippage, "%"))))));
}

// ui/components/LiquidityForm.tsx
import { useEffect as useEffect4, useState as useState4 } from "react";
function LiquidityForm({
  onLiquiditySubmit,
  virtualBaseTokensName = "Yes",
  virtualQuoteTokensName = "No",
  isConnected = false,
  onConnectWallet
}) {
  const form = useLiquidityForm();
  const { handleSubmit, control, watch, setValue: _setValue } = form;
  const [walletBalance, _setWalletBalance] = useState4("100.0");
  const [virtualBaseTokens, setVirtualBaseTokens] = useState4("0");
  const [virtualQuoteTokens, setVirtualQuoteTokens] = useState4("0");
  const [_estimatedResultingBalance, setEstimatedResultingBalance] = useState4(walletBalance);
  const depositAmount = watch("depositAmount");
  const lowPrice = watch("lowPrice");
  const highPrice = watch("highPrice");
  useEffect4(() => {
    const depositNum = parseFloat(depositAmount || "0");
    if (depositNum === 0) {
      setVirtualBaseTokens("0");
      setVirtualQuoteTokens("0");
      setEstimatedResultingBalance(walletBalance);
      return;
    }
    setVirtualBaseTokens((depositNum * 0.8).toFixed(4));
    setVirtualQuoteTokens((depositNum * 0.2).toFixed(4));
    const newBalance = (parseFloat(walletBalance) - depositNum).toFixed(4);
    setEstimatedResultingBalance(newBalance);
  }, [depositAmount, lowPrice, highPrice, walletBalance]);
  const handleFormSubmit = (data) => {
    if (onLiquiditySubmit) {
      onLiquiditySubmit(data);
    } else {
      form.onSubmit(data);
    }
  };
  return /* @__PURE__ */ React.createElement(Form, { ...form }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit(handleFormSubmit), className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement(FormLabel, { className: "block mb-2" }, "Collateral"), /* @__PURE__ */ React.createElement(
    FormField,
    {
      control,
      name: "depositAmount",
      render: ({ field }) => /* @__PURE__ */ React.createElement(FormItem, null, /* @__PURE__ */ React.createElement(FormControl, null, /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
        Input,
        {
          placeholder: "0",
          type: "text",
          className: "rounded-r-none",
          ...field
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "px-4 flex items-center border border-input bg-muted rounded-r-md ml-[-1px]" }, virtualQuoteTokensName))), /* @__PURE__ */ React.createElement(FormMessage, null))
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement(FormLabel, { className: "block mb-2" }, "Low Price"), /* @__PURE__ */ React.createElement(
    FormField,
    {
      control,
      name: "lowPrice",
      render: ({ field }) => /* @__PURE__ */ React.createElement(FormItem, null, /* @__PURE__ */ React.createElement(FormControl, null, /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
        Input,
        {
          placeholder: "0",
          type: "text",
          className: "rounded-r-none",
          ...field
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "px-4 flex items-center border border-input bg-muted rounded-r-md ml-[-1px]" }, `${virtualBaseTokensName}/${virtualQuoteTokensName}`))), /* @__PURE__ */ React.createElement(FormMessage, null))
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement(FormLabel, { className: "block mb-2" }, "High Price"), /* @__PURE__ */ React.createElement(
    FormField,
    {
      control,
      name: "highPrice",
      render: ({ field }) => /* @__PURE__ */ React.createElement(FormItem, null, /* @__PURE__ */ React.createElement(FormControl, null, /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
        Input,
        {
          placeholder: "0",
          type: "text",
          className: "rounded-r-none",
          ...field
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "px-4 flex items-center border border-input bg-muted rounded-r-md ml-[-1px]" }, `${virtualBaseTokensName}/${virtualQuoteTokensName}`))), /* @__PURE__ */ React.createElement(FormMessage, null))
    }
  )), /* @__PURE__ */ React.createElement(SlippageTolerance, null), /* @__PURE__ */ React.createElement("div", { className: "mt-6" }, isConnected ? /* @__PURE__ */ React.createElement(Button, { type: "submit", className: "w-full" }, "Add Liquidity") : /* @__PURE__ */ React.createElement(Button, { type: "button", className: "w-full", onClick: onConnectWallet }, "Connect Wallet")), /* @__PURE__ */ React.createElement("div", { className: "pt-4 mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-muted-foreground mb-1" }, "Position"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, "New Position")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-muted-foreground mb-1" }, virtualBaseTokensName, " Tokens"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, /* @__PURE__ */ React.createElement(NumberDisplay, { value: virtualBaseTokens }), " v", virtualBaseTokensName, " (Min.", " ", /* @__PURE__ */ React.createElement(NumberDisplay, { value: virtualBaseTokens }), ")")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-muted-foreground mb-1" }, virtualQuoteTokensName, " Tokens"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, /* @__PURE__ */ React.createElement(NumberDisplay, { value: virtualQuoteTokens }), " v", virtualQuoteTokensName, " (Min.", " ", /* @__PURE__ */ React.createElement(NumberDisplay, { value: virtualQuoteTokens }), ")"))))));
}

// ui/components/ColoredRadioOption.tsx
import * as React11 from "react";
function withAlpha(hexColor, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  const alphaByte = Math.round(a * 255);
  const alphaHex = alphaByte.toString(16).padStart(2, "0");
  const normalized = hexColor.replace("#", "").trim();
  const base = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  return `#${base}${alphaHex}`;
}
var ColoredRadioOption = ({
  label,
  color,
  checked,
  onClick,
  className,
  disabled
}) => {
  const unselectedBg = withAlpha(color, 0.08);
  const hoverBg = withAlpha(color, 0.16);
  const borderColor = withAlpha(color, 0.24);
  return /* @__PURE__ */ React11.createElement(
    Button,
    {
      type: "button",
      role: "radio",
      "aria-checked": checked,
      disabled,
      onClick,
      className: cn(
        "text-center justify-start font-normal border flex items-center gap-3 text-foreground",
        className
      ),
      style: {
        backgroundColor: unselectedBg,
        borderColor
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = unselectedBg;
      }
    },
    /* @__PURE__ */ React11.createElement(
      "span",
      {
        className: "inline-flex items-center justify-center rounded-full",
        style: {
          width: 16,
          height: 16,
          border: `2px solid ${color}`
        },
        "aria-hidden": true
      },
      checked ? /* @__PURE__ */ React11.createElement(
        "span",
        {
          className: "block rounded-full",
          style: {
            width: 8,
            height: 8,
            backgroundColor: color
          }
        }
      ) : null
    ),
    /* @__PURE__ */ React11.createElement("span", { className: "truncate" }, label)
  );
};

// ui/components/SearchBar.tsx
import { useEffect as useEffect5, useRef, useState as useState5 } from "react";
import { SearchIcon, X } from "lucide-react";
var SearchBar = ({
  isMobile,
  value,
  onChange
}) => {
  const inputRef = useRef(null);
  const [hasText, setHasText] = useState5(!!value);
  useEffect5(() => {
    setHasText(!!value);
  }, [value]);
  const handleClear = () => {
    setHasText(false);
    const input = inputRef.current;
    if (input) {
      input.value = "";
      onChange({
        target: input,
        currentTarget: input
      });
      input.focus();
    } else {
      onChange({
        target: { value: "" },
        currentTarget: { value: "" }
      });
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "relative flex items-center" }, /* @__PURE__ */ React.createElement(
    SearchIcon,
    {
      className: "absolute left-1 md:left-0 top-1/2 md:top-0 md:bottom-0 -translate-y-1/2 md:translate-y-0 h-5 w-5 md:h-full md:w-auto md:p-3 text-muted-foreground opacity-60 z-10 pointer-events-none",
      strokeWidth: 1
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative border-b border-border/90" }, /* @__PURE__ */ React.createElement(
    Input,
    {
      ref: inputRef,
      type: "text",
      placeholder: isMobile ? "Search" : "Search questions...",
      value,
      onChange,
      className: "w-full text-lg md:text-3xl font-heading font-normal bg-transparent rounded-none border-0 placeholder:text-foreground md:placeholder:text-muted-foreground placeholder:opacity-50 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1.5 md:py-3 pl-8 md:pl-16 pr-8 md:pr-14"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-label": "Clear search",
      onClick: handleClear,
      className: `absolute right-1 md:right-0 top-[60%] -translate-y-1/2 p-2 text-muted-foreground/60 hover:text-muted-foreground/80 z-10 transition-opacity duration-200 ease-out ${hasText ? "opacity-60 hover:opacity-80 focus:opacity-80" : "opacity-0 pointer-events-none"}`
    },
    /* @__PURE__ */ React.createElement(X, { className: "h-4 w-4 md:h-5 md:w-5", strokeWidth: 1 })
  )));
};
export {
  Button,
  ColoredRadioOption,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  LiquidityForm,
  NumberDisplay,
  SearchBar,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SlippageTolerance,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TradeForm,
  buttonVariants,
  reducer,
  toast,
  useFormField,
  useIsBelow,
  useIsMobile,
  useLiquidityForm,
  useToast,
  useTradeForm
};
