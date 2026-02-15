import { useState, useEffect, useRef } from 'react';

/**
 * Hook to manage screen transitions between game states.
 * Delays the state switch by 200ms for a fade-out, then triggers fade-in.
 */
export function useScreenTransition(currentState: number) {
    const [displayState, setDisplayState] = useState(currentState);
    const [transitionClass, setTransitionClass] = useState('screen-enter');
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            setDisplayState(currentState);
            return;
        }

        if (currentState === displayState) return;

        // Fade out
        setTransitionClass('screen-exit');

        const timer = setTimeout(() => {
            setDisplayState(currentState);
            setTransitionClass('screen-enter');
        }, 200);

        return () => clearTimeout(timer);
    }, [currentState, displayState]);

    return { displayState, transitionClass };
}
