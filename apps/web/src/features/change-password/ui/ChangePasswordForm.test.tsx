import { ChangePasswordForm } from './ChangePasswordForm';
import { setup, screen } from '@/test/setup';

const { mockChangePassword, mockReplace } = vi.hoisted(() => ({
  mockChangePassword: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ changePassword: mockChangePassword }),
}));

describe('should change the password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangePassword.mockResolvedValue(undefined);
  });

  it('should show an error and not submit when the new passwords do not match', async () => {
    const { user } = setup(<ChangePasswordForm />);

    await user.type(
      screen.getByPlaceholderText('Current password'),
      'oldpass1',
    );
    await user.type(
      screen.getByPlaceholderText('New password (min 8 characters)'),
      'newpass1',
    );
    await user.type(
      screen.getByPlaceholderText('Confirm new password'),
      'otherpass1',
    );
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('should submit the entered data and redirect to login on success', async () => {
    const { user } = setup(<ChangePasswordForm />);

    await user.type(
      screen.getByPlaceholderText('Current password'),
      'oldpass1',
    );
    await user.type(
      screen.getByPlaceholderText('New password (min 8 characters)'),
      'newpass1',
    );
    await user.type(
      screen.getByPlaceholderText('Confirm new password'),
      'newpass1',
    );
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpass1',
      newPassword: 'newpass1',
    });
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
