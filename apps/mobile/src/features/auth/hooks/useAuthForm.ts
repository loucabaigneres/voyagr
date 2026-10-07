import { useState } from 'react';
import type * as z from 'zod';

import { authErrorMessage, type AuthError } from '../lib/errors';
import { validate, type FieldErrors } from '../lib/validation';
import { syncQueriesWithSession } from '../query-cache';

interface UseAuthFormOptions<S extends z.ZodObject> {
  schema: S;
  initialValues: z.input<S>;
  /** The Better Auth call;
   *  resolves with its `error` (null on success). */
  request: (data: z.output<S>) => Promise<{ error: AuthError | null }>;
  onSuccess: () => void;
}

export function useAuthForm<S extends z.ZodObject>({
  schema,
  initialValues,
  request,
  onSuccess,
}: UseAuthFormOptions<S>) {
  type Values = z.input<S>;

  const [values, setValues] = useState<Values>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Values>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    if (isSubmitting) return;
    setFormError(null);

    const result = validate(schema, values);
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await request(result.data);
      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }
      await syncQueriesWithSession('signed-in');
      onSuccess();
    } catch {
      setFormError(authErrorMessage(null));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { values, setField, fieldErrors, formError, isSubmitting, submit };
}
