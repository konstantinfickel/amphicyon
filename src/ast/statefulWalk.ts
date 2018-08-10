import { head, tail } from 'lodash';
import { Node } from './node';
import { Trace, walk } from './walk';

interface StateContext {
  state: string[];
  newState: string;
}

interface StateAstWalkerEntry<T> {
  enter?: (trace: Trace, context: T) => { context: T; nextState?: string, skipSubtree?: boolean };
  leave?: (trace: Trace, context: T) => T;
  leaveState?: (trace: Trace, content: T) => T;
}

export interface StateAstWalker<T extends object> {
  default: StateAstWalkerEntry<T>;
  [state: string]: StateAstWalkerEntry<T>;
}

export const walkState = <T extends object>(
  node: Node,
  astWalker: StateAstWalker<T>,
  context: T,
) =>
  walk<T & StateContext>(
    node,
    {
      enter: (trace: Trace, enterContext: T & StateContext) => {
        const currentState = head(enterContext.state) as string;
        if (astWalker[currentState] != null) {
          const enterFunction = astWalker[currentState].enter;
          if (enterFunction != null) {
            const {
              context: contextAfterEnter,
              nextState = currentState,
              skipSubtree = false
            } = enterFunction(trace, enterContext);

            return {
              skipSubtree,
              context: {
                ...contextAfterEnter as any,
                state: [nextState, ...enterContext.state],
              } as T & StateContext
            }
          }

          return {
            skipSubtree: false,
            context: {
              ...enterContext as any,
              state: [currentState, ...enterContext.state]
            }
          };
        } else {
          throw new Error(
            `No transition function defined for state '${currentState}'`,
          );
        }
      },
      leave: (trace: Trace, leaveContext: T & StateContext) => {
        const currentState = head(leaveContext.state) as string;
        if (astWalker[currentState] != null) {
          const currentAstWalker = astWalker[currentState];
          let contextAfterLeave: T = leaveContext;
          if (currentAstWalker.leave != null) {
            contextAfterLeave = currentAstWalker.leave(trace, leaveContext);
          }

          let contextAfterLeaveState = contextAfterLeave;
          if (
            currentAstWalker.leaveState != null &&
            leaveContext.state.length > 1 &&
            currentState !== head(tail(leaveContext.state))
          ) {
            contextAfterLeaveState = currentAstWalker.leaveState(
              trace,
              leaveContext,
            );
          }

          return {
            context: {
              ...(contextAfterLeaveState as any),
              state: tail(leaveContext.state),
            }
          };
        } else {
          throw new Error(
            `No transition function defined for state '${currentState}'`,
          );
        }
      },
    },
    { ...(context as any), state: ['default'] },
  );
