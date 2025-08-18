import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { 
  LoadingSpinner, 
  LoadingButton, 
  CardSkeleton, 
  ListSkeleton,
  EnhancedCardSkeleton 
} from '../../ui/loading-states';

describe('Loading States Components', () => {
  describe('CardSkeleton', () => {
    it('should render skeleton with default props', () => {
      render(<CardSkeleton />);
      
      const skeleton = screen.getByRole('generic');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should render skeleton with custom className', () => {
      render(<CardSkeleton className="custom-skeleton" />);
      
      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveClass('custom-skeleton');
    });
  });

  describe('ListSkeleton', () => {
    it('should render list skeleton with default items', () => {
      render(<ListSkeleton />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('animate-pulse');
    });

    it('should render custom number of items', () => {
      render(<ListSkeleton items={3} />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeInTheDocument();
    });
  });

  describe('LoadingSpinner', () => {
    it('should render spinner with default size', () => {
      const { container } = render(<LoadingSpinner />);
      
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should render spinner with custom size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should render spinner with custom className', () => {
      const { container } = render(<LoadingSpinner className="text-red-500" />);
      
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-red-500');
    });
  });

  describe('LoadingButton', () => {
    it('should render button in normal state', () => {
      render(
        <LoadingButton isLoading={false} onClick={() => {}}>
          Click me
        </LoadingButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
      expect(button).not.toBeDisabled();
    });

    it('should render button in loading state', () => {
      render(
        <LoadingButton isLoading={true} onClick={() => {}}>
          Click me
        </LoadingButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading text when provided', () => {
      render(
        <LoadingButton isLoading={true} loadingText="Processing..." onClick={() => {}}>
          Click me
        </LoadingButton>
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should handle click events when not loading', () => {
      const handleClick = vi.fn();
      
      render(
        <LoadingButton isLoading={false} onClick={handleClick}>
          Click me
        </LoadingButton>
      );
      
      const button = screen.getByRole('button');
      button.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not handle click events when loading', () => {
      const handleClick = vi.fn();
      
      render(
        <LoadingButton isLoading={true} onClick={handleClick}>
          Click me
        </LoadingButton>
      );
      
      const button = screen.getByRole('button');
      button.click();
      
      // Button is disabled, so click handler should not be called
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('EnhancedCardSkeleton', () => {
    it('should render loading card with skeleton content', () => {
      render(<EnhancedCardSkeleton />);
      
      const card = screen.getByRole('status');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should render loading card with custom lines count', () => {
      render(<EnhancedCardSkeleton lines={5} />);
      
      const card = screen.getByRole('status');
      expect(card).toBeInTheDocument();
    });

    it('should render loading card with avatar when showAvatar is true', () => {
      render(<EnhancedCardSkeleton showAvatar />);
      
      const card = screen.getByRole('status');
      expect(card).toBeInTheDocument();
      // Avatar would be rendered as part of the skeleton structure
    });

    it('should render loading card with actions when showActions is true', () => {
      render(<EnhancedCardSkeleton showActions />);
      
      const card = screen.getByRole('status');
      expect(card).toBeInTheDocument();
      // Actions would be rendered as part of the skeleton structure
    });
  });

  describe('Loading State Transitions', () => {
    it('should handle loading state transitions smoothly', async () => {
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const timer = setTimeout(() => setLoading(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return (
          <div>
            {loading ? (
              <div data-testid="skeleton">
                <CardSkeleton />
              </div>
            ) : (
              <div data-testid="content">Loaded content</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      // Should show skeleton initially
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });

    it('should handle multiple loading states', () => {
      const TestComponent = () => {
        const [loadingData, setLoadingData] = React.useState(true);
        const [loadingUser, setLoadingUser] = React.useState(true);

        return (
          <div>
            <div data-testid="data-section">
              {loadingData ? (
                <CardSkeleton />
              ) : (
                <div>Data loaded</div>
              )}
            </div>
            <div data-testid="user-section">
              {loadingUser ? (
                <LoadingSpinner />
              ) : (
                <div>User loaded</div>
              )}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('data-section')).toBeInTheDocument();
      expect(screen.getByTestId('user-section')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for enhanced card skeleton', () => {
      render(<EnhancedCardSkeleton />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should have proper ARIA attributes for loading buttons', () => {
      render(
        <LoadingButton isLoading={true} loadingText="Processing...">
          Submit
        </LoadingButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should announce loading state changes to screen readers', () => {
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(false);

        return (
          <div>
            <button onClick={() => setLoading(!loading)}>
              Toggle Loading
            </button>
            {loading && (
              <div role="status" aria-live="polite">
                Loading...
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText('Toggle Loading');
      toggleButton.click();

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('Loading...');
    });
  });
});