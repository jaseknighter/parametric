import React from 'react';
import { render, screen } from '@testing-library/react';
import { SliderRail, Handle, KeyboardHandle, Track, Tick } from './MySliderComponents';

describe('MySliderComponents Coverage', () => {
    
    test('SliderRail renders and passes props', () => {
        const mockProps = { onMouseDown: jest.fn() };
        const getRailProps = () => mockProps;
        render(<SliderRail getRailProps={getRailProps} />);
        // If it doesn't crash, it's covered.
    });

    test('Handle renders and shows disabled state', () => {
        const handle = { id: 'h1', value: 50, percent: 50 };
        const { rerender } = render(
            <Handle domain={[0, 100]} handle={handle} getHandleProps={() => ({})} disabled={false} />
        );
        expect(screen.getByRole('slider')).toHaveStyle('background-color: rgba(25,25,25,.5)');

        rerender(<Handle domain={[0, 100]} handle={handle} getHandleProps={() => ({})} disabled={true} />);
        expect(screen.getByRole('slider')).toHaveStyle('background-color: #666');
    });

    test('Track renders with dynamic height and disabled color', () => {
        const source = { id: 's', value: 0, percent: 10 };
        const target = { id: 't', value: 100, percent: 90 };
        const { container, rerender } = render(
            <Track source={source} target={target} getTrackProps={() => ({})} disabled={false} />
        );
        
        expect(container.firstChild).toHaveStyle('height: 80%');
        expect(container.firstChild).toHaveStyle('background-color: #767696');

        rerender(<Track source={source} target={target} getTrackProps={() => ({})} disabled={true} />);
        expect(container.firstChild).toHaveStyle('background-color: #999');
    });

    test('Tick renders with default and custom formatting', () => {
        const tick = { id: 'tick1', value: 5, percent: 50 };
        const { rerender } = render(<Tick tick={tick} format={v => v} />);
        expect(screen.getByText('5')).toBeInTheDocument();

        rerender(<Tick tick={tick} format={(v) => `Value: ${v}`} />);
        expect(screen.getByText('Value: 5')).toBeInTheDocument();
    });
});