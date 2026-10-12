import { ExportTasksCsvButton } from './ExportTasksCsvButton';
import { setup, screen } from '@/test/setup';

const mockFetchTasksCsv = vi.fn();

vi.mock('@/shared/api/tasks', () => ({
  fetchTasksCsv: () => mockFetchTasksCsv(),
}));

describe('should download csv on button click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('should call fetchTasksCsv and create a download link', async () => {
    mockFetchTasksCsv.mockResolvedValue(new Blob());
    const clicked: HTMLAnchorElement[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function clickedAnchor(this: HTMLAnchorElement) {
        clicked.push(this);
      });
    const { user } = setup(<ExportTasksCsvButton />);
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(mockFetchTasksCsv).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clicked[0].download).toMatch(/^tasks-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('should show an error message when fetchTasksCsv rejects', async () => {
    mockFetchTasksCsv.mockRejectedValue(new Error('Network error'));
    const { user } = setup(<ExportTasksCsvButton />);
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
