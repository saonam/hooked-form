import * as React from 'react';
import Form, { FormOptions } from './Form';
import { InitialValues } from './types';
import { useContextEmitter } from './useContextEmitter';

type FormHocOptions<T> = FormOptions<T> & {
  mapPropsToValues?: (props: object) => InitialValues;
};

const OptionsContainer = <Values extends object>({
  enableReinitialize,
  mapPropsToValues,
  ...rest
}: FormHocOptions<Values>) => {
  let isMounted = false;

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'The Higher-order component has been deprecated. use <HookedForm> instead.'
    );
  }

  return function FormOuterWrapper(
    Component: React.ComponentType<any> | React.FC<any>
  ) {
    const NewComponent = (props: any) => {
      const ctx = useContextEmitter(['f', 's']);
      return (
        <Component
          change={ctx.setFieldValue}
          formError={ctx.formError}
          handleSubmit={ctx.submit}
          isSubmitting={ctx.isSubmitting}
          resetForm={ctx.resetForm}
          isDirty={ctx.isDirty}
          {...props}
        />
      );
    };

    return function FormWrapper(props: { [property: string]: any }) {
      const { 0: initialValues, 1: setInitialValues } = React.useState(() =>
        mapPropsToValues ? mapPropsToValues(props) : rest.initialValues
      );

      // Make our listener for the reinitialization when need be.
      React.useEffect(
        () => {
          if (enableReinitialize && mapPropsToValues && isMounted)
            setInitialValues(mapPropsToValues(props));
          isMounted = true;
        },
        enableReinitialize ? Object.values(props) : []
      );

      return (
        <Form<Values>
          {...rest}
          enableReinitialize={enableReinitialize}
          initialValues={initialValues}
          noForm={true}
          validateOnBlur={
            /* istanbul ignore next */
            rest.validateOnBlur === undefined ? false : rest.validateOnBlur
          }
        >
          <NewComponent {...props} />
        </Form>
      );
    };
  };
};

export default OptionsContainer;
