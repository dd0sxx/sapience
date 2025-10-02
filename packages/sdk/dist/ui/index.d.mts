import * as React from 'react';
import React__default from 'react';
import * as class_variance_authority_types from 'class-variance-authority/types';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { VariantProps } from 'class-variance-authority';
import * as react_hook_form from 'react-hook-form';
import { FieldValues, FieldPath, ControllerProps } from 'react-hook-form';
import * as _radix_ui_react_slot from '@radix-ui/react-slot';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

declare const Toast$1: React.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastProps & React.RefAttributes<HTMLLIElement>, "ref"> & VariantProps<(props?: ({
    variant?: "default" | "destructive" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string> & React.RefAttributes<HTMLLIElement>>;
declare const ToastAction: React.ForwardRefExoticComponent<Omit<ToastPrimitives.ToastActionProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast$1>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

interface CustomToastProps extends ToastProps {
    style?: React.CSSProperties;
}
type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
};
declare const _actionTypes: {
    readonly ADD_TOAST: "ADD_TOAST";
    readonly UPDATE_TOAST: "UPDATE_TOAST";
    readonly DISMISS_TOAST: "DISMISS_TOAST";
    readonly REMOVE_TOAST: "REMOVE_TOAST";
};
type ActionType = typeof _actionTypes;
type Action = {
    type: ActionType['ADD_TOAST'];
    toast: ToasterToast;
} | {
    type: ActionType['UPDATE_TOAST'];
    toast: Partial<ToasterToast>;
} | {
    type: ActionType['DISMISS_TOAST'];
    toastId?: ToasterToast['id'];
} | {
    type: ActionType['REMOVE_TOAST'];
    toastId?: ToasterToast['id'];
};
interface State {
    toasts: ToasterToast[];
}
declare const reducer: (state: State, action: Action) => State;
type Toast = Omit<ToasterToast, 'id'>;
declare function toast({ ...props }: Toast & CustomToastProps): {
    id: string;
    dismiss: () => void;
    update: (propsArg: ToasterToast) => void;
};
declare function useToast(): {
    toast: typeof toast;
    dismiss: (toastId?: string) => void;
    toasts: ToasterToast[];
};

declare function useIsMobile(): boolean;
declare function useIsBelow(breakpoint: number): boolean;

interface LiquidityFormValues {
    depositAmount: string;
    lowPrice: string;
    highPrice: string;
    slippage: string;
}
interface UseLiquidityFormProps {
    lowPrice?: string;
    highPrice?: string;
}
declare function useLiquidityForm({ lowPrice, highPrice, }?: UseLiquidityFormProps): {
    onSubmit: (data: LiquidityFormValues) => void;
    watch: react_hook_form.UseFormWatch<LiquidityFormValues>;
    getValues: react_hook_form.UseFormGetValues<LiquidityFormValues>;
    getFieldState: react_hook_form.UseFormGetFieldState<LiquidityFormValues>;
    setError: react_hook_form.UseFormSetError<LiquidityFormValues>;
    clearErrors: react_hook_form.UseFormClearErrors<LiquidityFormValues>;
    setValue: react_hook_form.UseFormSetValue<LiquidityFormValues>;
    trigger: react_hook_form.UseFormTrigger<LiquidityFormValues>;
    formState: react_hook_form.FormState<LiquidityFormValues>;
    resetField: react_hook_form.UseFormResetField<LiquidityFormValues>;
    reset: react_hook_form.UseFormReset<LiquidityFormValues>;
    handleSubmit: react_hook_form.UseFormHandleSubmit<LiquidityFormValues, undefined>;
    unregister: react_hook_form.UseFormUnregister<LiquidityFormValues>;
    control: react_hook_form.Control<LiquidityFormValues, any>;
    register: react_hook_form.UseFormRegister<LiquidityFormValues>;
    setFocus: react_hook_form.UseFormSetFocus<LiquidityFormValues>;
};

interface TradeFormValues {
    size: string;
    slippage: string;
    direction: 'Long' | 'Short';
}
declare function useTradeForm(): {
    onSubmit: (data: TradeFormValues) => void;
    watch: react_hook_form.UseFormWatch<TradeFormValues>;
    getValues: react_hook_form.UseFormGetValues<TradeFormValues>;
    getFieldState: react_hook_form.UseFormGetFieldState<TradeFormValues>;
    setError: react_hook_form.UseFormSetError<TradeFormValues>;
    clearErrors: react_hook_form.UseFormClearErrors<TradeFormValues>;
    setValue: react_hook_form.UseFormSetValue<TradeFormValues>;
    trigger: react_hook_form.UseFormTrigger<TradeFormValues>;
    formState: react_hook_form.FormState<TradeFormValues>;
    resetField: react_hook_form.UseFormResetField<TradeFormValues>;
    reset: react_hook_form.UseFormReset<TradeFormValues>;
    handleSubmit: react_hook_form.UseFormHandleSubmit<TradeFormValues, undefined>;
    unregister: react_hook_form.UseFormUnregister<TradeFormValues>;
    control: react_hook_form.Control<TradeFormValues, any>;
    register: react_hook_form.UseFormRegister<TradeFormValues>;
    setFocus: react_hook_form.UseFormSetFocus<TradeFormValues>;
};

declare const buttonVariants: (props?: ({
    variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
    size?: "default" | "icon" | "sm" | "xs" | "lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}
declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

declare const Form: <TFieldValues extends FieldValues, TContext = any, TTransformedValues extends FieldValues | undefined = undefined>(props: react_hook_form.FormProviderProps<TFieldValues, TContext, TTransformedValues>) => React.JSX.Element;
declare const FormField: <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({ ...props }: ControllerProps<TFieldValues, TName>) => React.JSX.Element;
declare const useFormField: () => {
    invalid: boolean;
    isDirty: boolean;
    isTouched: boolean;
    isValidating: boolean;
    error?: react_hook_form.FieldError;
    id: string;
    name: string;
    formItemId: string;
    formDescriptionId: string;
    formMessageId: string;
};
declare const FormItem: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const FormLabel: React.ForwardRefExoticComponent<Omit<LabelPrimitive.LabelProps & React.RefAttributes<HTMLLabelElement>, "ref"> & React.RefAttributes<HTMLLabelElement>>;
declare const FormControl: React.ForwardRefExoticComponent<Omit<_radix_ui_react_slot.SlotProps & React.RefAttributes<HTMLElement>, "ref"> & React.RefAttributes<HTMLElement>>;
declare const FormDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const FormMessage: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;

declare const inputVariants: (props?: ({
    inputSize?: "default" | "sm" | "xs" | "lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {
    endAdornment?: React.ReactNode;
}
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;

declare const Select: React.FC<SelectPrimitive.SelectProps>;
declare const SelectGroup: React.ForwardRefExoticComponent<SelectPrimitive.SelectGroupProps & React.RefAttributes<HTMLDivElement>>;
declare const SelectValue: React.ForwardRefExoticComponent<SelectPrimitive.SelectValueProps & React.RefAttributes<HTMLSpanElement>>;
declare const SelectTrigger: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const SelectScrollUpButton: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectScrollUpButtonProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SelectScrollDownButton: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectScrollDownButtonProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SelectContent: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SelectLabel: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectLabelProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SelectItem: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectItemProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SelectSeparator: React.ForwardRefExoticComponent<Omit<SelectPrimitive.SelectSeparatorProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;

declare const Label: React.ForwardRefExoticComponent<Omit<LabelPrimitive.LabelProps & React.RefAttributes<HTMLLabelElement>, "ref"> & VariantProps<(props?: class_variance_authority_types.ClassProp | undefined) => string> & React.RefAttributes<HTMLLabelElement>>;

declare const Tabs: React.ForwardRefExoticComponent<TabsPrimitive.TabsProps & React.RefAttributes<HTMLDivElement>>;
declare const TabsList: React.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsListProps & React.RefAttributes<HTMLDivElement>, "ref"> & VariantProps<(props?: ({
    size?: "default" | "sm" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string> & React.RefAttributes<HTMLDivElement>>;
declare const TabsTrigger: React.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & VariantProps<(props?: ({
    size?: "default" | "sm" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string> & React.RefAttributes<HTMLButtonElement>>;
declare const TabsContent: React.ForwardRefExoticComponent<Omit<TabsPrimitive.TabsContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;

declare const TooltipProvider: React.FC<TooltipPrimitive.TooltipProviderProps>;
type TooltipProps = TooltipPrimitive.TooltipProps & {
    /**
     * Force using desktop Tooltip behavior even on touch devices.
     */
    forceTooltipOnTouch?: boolean;
};
declare const Tooltip: ({ children, delayDuration, forceTooltipOnTouch, open, defaultOpen, onOpenChange, ..._props }: TooltipProps) => React.JSX.Element;
declare const TooltipTrigger: React.ForwardRefExoticComponent<Omit<TooltipPrimitive.TooltipTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const TooltipContent: React.ForwardRefExoticComponent<Omit<TooltipPrimitive.TooltipContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;

declare const Textarea: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, "ref"> & React.RefAttributes<HTMLTextAreaElement>>;

interface TradeFormProps {
    onTradeSubmit: (data: TradeFormValues) => Promise<void>;
    collateralAssetTicker?: string;
    walletBalanceDisplay?: string;
    initialDirection?: 'Long' | 'Short';
    initialSize?: string;
    initialSlippage?: number;
    getEstimatedCost?: (size: string, direction: 'Long' | 'Short') => Promise<string>;
    isLoading?: boolean;
    isApproving?: boolean;
    needsApproval?: boolean;
    submitError?: Error | null;
}
declare function TradeForm({ onTradeSubmit, collateralAssetTicker, walletBalanceDisplay, initialDirection, initialSize, initialSlippage, getEstimatedCost, isLoading, isApproving, needsApproval, submitError, }: TradeFormProps): React.JSX.Element;

interface LiquidityFormProps {
    onLiquiditySubmit?: (data: LiquidityFormValues) => void;
    virtualBaseTokensName?: string;
    virtualQuoteTokensName?: string;
    isConnected?: boolean;
    onConnectWallet?: () => void;
}
declare function LiquidityForm({ onLiquiditySubmit, virtualBaseTokensName, virtualQuoteTokensName, isConnected, onConnectWallet, }: LiquidityFormProps): React.JSX.Element;

interface NumberDisplayProps {
    value: number | string | bigint;
    precision?: number;
    padZeros?: boolean;
}
declare const NumberDisplay: React__default.FC<NumberDisplayProps>;

declare const SlippageTolerance: React__default.FC;

interface ColoredRadioOptionProps {
    label: React.ReactNode;
    color: string;
    checked: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    disabled?: boolean;
}
declare const ColoredRadioOption: React.FC<ColoredRadioOptionProps>;

interface SearchBarProps {
    isMobile: boolean;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
declare const SearchBar: React.FC<SearchBarProps>;

export { Button, type ButtonProps, ColoredRadioOption, type ColoredRadioOptionProps, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, type InputProps, Label, LiquidityForm, type LiquidityFormProps, type LiquidityFormValues, NumberDisplay, type NumberDisplayProps, SearchBar, type SearchBarProps, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue, SlippageTolerance, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TradeForm, type TradeFormProps, type TradeFormValues, type UseLiquidityFormProps, buttonVariants, reducer, toast, useFormField, useIsBelow, useIsMobile, useLiquidityForm, useToast, useTradeForm };
