import type { AdminUser } from '@repo/shared';
import { ChangeRoleSelect } from './ChangeRoleSelect';
import { setup, screen } from '@/test/setup';

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));

vi.mock('@/entities/user', () => ({
  useUpdateUserRole: () => ({ mutate: mockMutate, isPending: false }),
}));

function makeTarget(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u-2',
    email: 'target@example.com',
    name: 'Target User',
    role: 'USER',
    isBlocked: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    tasksCount: 1,
    projectsCount: 0,
    ...overrides,
  };
}

function optionValues(select: HTMLElement): string[] {
  return Array.from((select as HTMLSelectElement).options).map(
    (option) => option.value,
  );
}

describe('should change the role within the hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a badge for a target the actor does not manage', () => {
    setup(
      <ChangeRoleSelect
        target={makeTarget({ role: 'OWNER' })}
        actorRole="ADMIN"
        isSelf={false}
      />,
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should render a badge for the actor themself', () => {
    setup(<ChangeRoleSelect target={makeTarget()} actorRole="ADMIN" isSelf />);

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should offer an OWNER only the roles below ADMIN and USER', () => {
    setup(
      <ChangeRoleSelect
        target={makeTarget()}
        actorRole="OWNER"
        isSelf={false}
      />,
    );

    const select = screen.getByRole('combobox');

    expect(optionValues(select)).toEqual(['ADMIN', 'USER']);
    expect((select as HTMLSelectElement).value).toBe('USER');
  });

  it('should offer an ADMIN only the USER role', () => {
    setup(
      <ChangeRoleSelect
        target={makeTarget()}
        actorRole="ADMIN"
        isSelf={false}
      />,
    );

    expect(optionValues(screen.getByRole('combobox'))).toEqual(['USER']);
  });

  it('should send the chosen role on change', async () => {
    const { user } = setup(
      <ChangeRoleSelect
        target={makeTarget()}
        actorRole="OWNER"
        isSelf={false}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox'), 'ADMIN');

    expect(mockMutate).toHaveBeenCalledWith({ id: 'u-2', role: 'ADMIN' });
  });
});
