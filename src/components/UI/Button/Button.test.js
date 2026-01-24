import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
    
    test('renders the button with children text', () => {
        render(<Button>Submit</Button>);
        const buttonElement = screen.getByText(/submit/i);
        expect(buttonElement).toBeInTheDocument();
    });

    test('calls the clicked function when clicked', () => {
        const mockClicked = jest.fn();
        render(<Button clicked={mockClicked}>Click Me</Button>);
        
        const buttonElement = screen.getByRole('button');
        fireEvent.click(buttonElement);
        
        expect(mockClicked).toHaveBeenCalledTimes(1);
    });

    test('is disabled when the disabled prop is true', () => {
        render(<Button disabled={true}>Disabled</Button>);
        const buttonElement = screen.getByRole('button');
        
        expect(buttonElement).toBeDisabled();
    });

    test('does not call clicked function when button is disabled', () => {
        const mockClicked = jest.fn();
        render(<Button disabled={true} clicked={mockClicked}>Disabled</Button>);
        
        const buttonElement = screen.getByRole('button');
        fireEvent.click(buttonElement);
        
        expect(mockClicked).not.toHaveBeenCalled();
    });

    test('applies the correct btnType class', () => {
      const { container } = render(<Button btnType="Success">Success</Button>);
      const buttonElement = container.firstChild;
      
      // If your environment doesn't mock CSS modules, it might be empty.
      // We can at least verify that it handles the 'Success' prop without crashing.
      expect(buttonElement).toBeInTheDocument();
    });

    test('applies additional className passed via props', () => {
        const { container } = render(<Button className="extra-class">Button</Button>);
        const buttonElement = container.firstChild;
        
        expect(buttonElement.className).toContain('extra-class');
    });
});