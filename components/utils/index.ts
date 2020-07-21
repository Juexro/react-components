export function className(name: any): string {
  if (Array.isArray(name)) {
    return name.reduce((total, current) => {
      const result = className(current);
      if (result) {
        total += `${total ? ' ' : ''}${result}`;
      }
      return total;
    }, '')
  }

  if (Object.prototype.toString.call(name) === '[object Object]') {
    return Object.entries(name).reduce((total, [k, v]) => {
      if (!!v) {
        total += `${total ? ' ' : ''}${k}`;
      }
      return total;
    }, '')
  }

  return !!name ? name : '';
}

export function classNames(...names: any[]) {
  return className(names);
}