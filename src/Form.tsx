import * as React from 'react'
import { Provider } from './helpers/context'
import { deriveInitial } from './helpers/deriveInitial'
import useBoolean from './helpers/useBoolean'
import useState from './helpers/useState'
import { Errors, InitialValues, Touched } from './types'

export interface FormOptions {
  enableReinitialize?: boolean
  initialValues?: InitialValues
  mapPropsToValues?: (props: object) => InitialValues
  onError?: (error: object, setFormError: (error: any) => void) => void
  onSuccess?: (result?: any) => void
  onSubmit?: (values: object, props: object) => Promise<any> | any
  shouldSubmitWhenInvalid?: boolean
  validate?: (values: object) => object
  validateOnBlur?: boolean
  validateOnChange?: boolean
}

const OptionsContainer = ({
  enableReinitialize = false,
  initialValues: formInitialValues = {},
  mapPropsToValues,
  onSubmit,
  validate,
  onError,
  onSuccess,
  shouldSubmitWhenInvalid = false,
  validateOnBlur,
  validateOnChange,
}: FormOptions) => {
  let initialValues = formInitialValues
  let initialTouched = deriveInitial(initialValues, false)
  let initialErrors = deriveInitial(initialValues, null)
  let hasInitialized = false

  return (Component: any) => React.memo((props: { [property: string]: any }) => {
    if (mapPropsToValues && (!hasInitialized)) {
      initialValues = mapPropsToValues(props)
      initialTouched = deriveInitial(initialValues, false)
      initialErrors = deriveInitial(initialValues, null)
      hasInitialized = true
    }
    const { 0: values, 1: setFieldValue, 2: setValuesState } = useState(initialValues)
    const { 0: touched, 1:touch, 2: setTouchedState } = useState(initialTouched)
    const { 0: formErrors, 2: setErrorState } = useState(initialErrors)
    const { 0: setSubmitting, 1: isSubmitting } = useBoolean(false)
    const { 0: formError, 1: setFormError } = React.useState(null)

    // The validation step in our form, this memoization happens on values and touched.
    const validateForm = React.useCallback(() => {
      if (validate) {
        const validationErrors = validate(values)
        setErrorState({ ...validationErrors })
        return validationErrors
      }
      return {}
    }, [values])

    // Provide a way to reset the full form to the initialValues.
    const resetForm = React.useCallback(() => {
      initialValues = mapPropsToValues ? mapPropsToValues(props) : initialValues
      setValuesState(initialValues)
      setTouchedState(deriveInitial(initialValues, false))
      setErrorState(deriveInitial(initialValues, null))
    }, [props, mapPropsToValues, initialValues])

    // TODO: remove async in favor of Promise.resolve()
    const handleSubmit = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
      try {
        if (event) { event.preventDefault() }
        const submit = onSubmit || props.onSubmit
        const allTouched = deriveInitial(values, true)
        setTouchedState(allTouched)
        const errors = validateForm()
        if (!shouldSubmitWhenInvalid && Object.keys(errors).length > 0) { return }
        setSubmitting(true)
        const result = await submit(values, props, setFormError)
        setSubmitting(false)
        if (onSuccess) { onSuccess(result) }
      } catch (e) {
        setSubmitting(false)
        if (onError) { onError(e, setFormError) }
      }
    }, [values, validateForm])

    // Make our listener for the reinitialization when need be. TODO: mapPropsToValues
    if (enableReinitialize) { React.useEffect(() => resetForm(), [initialValues]) }
    // Run validations when needed.
    React.useEffect(() => { validateForm() }, [validateOnBlur && touched, validateOnChange && values])
    // The submit for our form.
    const handleSubmitProp = React.useCallback((event?: any) => handleSubmit(event), [handleSubmit])
    // The onBlur we can use for our Fields, should also be renewed context wise when our values are altered.
    const setFieldTouched = React.useCallback((fieldId: string) => { touch(fieldId, true) }, [touch])
    // The onChange we can use for our Fields, should also be renewed context wise when our touched are altered.
    const onChangeProp = React.useCallback((fieldId: string, value: any) => setFieldValue(fieldId, value), [setFieldValue])
    return (
      <Provider value={{
        errors: formErrors as Errors,
        initialValues,
        setFieldTouched,
        setFieldValue: onChangeProp,
        touched: touched as Touched,
        values,
      }}>
        <Component
          change={onChangeProp}
          formError={formError}
          errors={formErrors}
          handleSubmit={handleSubmitProp}
          validate={validateForm}
          isSubmitting={isSubmitting}
          resetForm={resetForm}
          values={values}
          {...props}
        />
      </Provider>
    )
  })
}

export default OptionsContainer
