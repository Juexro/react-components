import { RouteMetaData } from '../routes';
import { History } from 'history';

export interface FunctionRouteComponentProps {
  children?: React.ReactNode;
  meta: RouteMetaData;
}

export interface ClassRouteComponentProps {
  history: History;
  meta: RouteMetaData;
}