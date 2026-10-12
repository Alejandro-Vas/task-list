import { RequireRole } from './RequireRole';
import { setup, screen } from '@/test/setup';

const { mockUseAuth, mockReplace } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('../model/auth-context', () => ({
  useAuth: mockUseAuth,
}));

const ADMIN_ROLES = ['ADMIN', 'OWNER'] as const;

function authAs(status: string, role: string | null = null) {
  mockUseAuth.mockReturnValue({
    status,
    user: role === null ? null : { id: 'u-1', email: 'a@b.c', name: 'A', role },
  });
}

describe('should gate a page by the user role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a loading notice while the session is restored', () => {
    authAs('loading');

    setup(<RequireRole roles={ADMIN_ROLES}><p>Panel</p></RequireRole>);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Panel')).not.toBeInTheDocument();
  });

  it('should redirect an anonymous visitor to the login page', () => {
    authAs('anonymous');

    const { container } = setup(
      <RequireRole roles={ADMIN_ROLES}>
        <p>Panel</p>
      </RequireRole>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(container).toBeEmptyDOMElement();
  });

  it('should redirect a plain user home and explain the refusal', () => {
    authAs('authenticated', 'USER');

    setup(
      <RequireRole roles={ADMIN_ROLES}>
        <p>Panel</p>
      </RequireRole>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(
      screen.getByText('You do not have access to this page.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Panel')).not.toBeInTheDocument();
  });

  it('should render children for an allowed role', () => {
    authAs('authenticated', 'ADMIN');

    setup(
      <RequireRole roles={ADMIN_ROLES}>
        <p>Panel</p>
      </RequireRole>,
    );

    expect(screen.getByText('Panel')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
