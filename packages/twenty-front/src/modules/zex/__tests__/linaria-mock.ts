/**
 * Runtime Linaria is unsupported under Jest; provide a passthrough styled mock.
 * Usage: jest.mock('@linaria/react', () => require('./linaria-mock').linariaMock);
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react') as typeof import('react');

const createComponent = (Tag: string | React.ElementType = 'div') => {
  const Component = React.forwardRef(
    (
      {
        children,
        className,
        ...rest
      }: {
        children?: React.ReactNode;
        className?: string;
      },
      ref: React.Ref<HTMLElement>,
    ) => {
      const Element = typeof Tag === 'string' ? Tag : 'div';

      return React.createElement(
        Element,
        { ref, className, ...rest },
        children,
      );
    },
  );

  Component.displayName = 'LinariaStyledMock';

  return Component;
};

/** Tagged-template or call → component factory. */
const templateFactory =
  (Tag: string | React.ElementType = 'div') =>
  () =>
    createComponent(Tag);

const styledFn = (Tag: string | React.ElementType) => templateFactory(Tag);

export const linariaMock = {
  __esModule: true,
  styled: Object.assign(styledFn, {
    div: templateFactory('div'),
    span: templateFactory('span'),
    section: templateFactory('section'),
    a: templateFactory('a'),
    button: templateFactory('button'),
    ul: templateFactory('ul'),
    li: templateFactory('li'),
  }),
};
