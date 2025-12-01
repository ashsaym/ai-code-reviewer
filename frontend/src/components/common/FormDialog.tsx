import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  MenuItem,
  FormHelperText,
} from '@mui/material';

interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'password' | 'number' | 'select';
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
}

interface FormDialogProps {
  open: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

const FormDialog: React.FC<FormDialogProps> = ({
  open,
  title,
  fields,
  values,
  onChange,
  submitLabel = 'Submit',
  loading = false,
  onSubmit,
  onCancel,
}) => {
  const isValid = fields
    .filter((f) => f.required)
    .every((f) => values[f.name]?.trim());

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map((field, idx) => (
          <React.Fragment key={field.name}>
            <TextField
              autoFocus={idx === 0}
              fullWidth
              label={field.label}
              type={field.type === 'textarea' ? 'text' : field.type === 'select' ? undefined : field.type || 'text'}
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
              multiline={field.multiline || field.type === 'textarea'}
              rows={field.rows || (field.type === 'textarea' ? 3 : 1)}
              placeholder={field.placeholder}
              select={field.type === 'select'}
              sx={{ mt: idx === 0 ? 2 : 2, mb: 0 }}
            >
              {field.type === 'select' && field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {field.helperText && (
              <FormHelperText sx={{ mt: 0.5, mb: idx === fields.length - 1 ? 0 : 1 }}>
                {field.helperText}
              </FormHelperText>
            )}
          </React.Fragment>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={!isValid || loading}
        >
          {loading ? <CircularProgress size={20} /> : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog;
