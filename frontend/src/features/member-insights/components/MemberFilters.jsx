import SearchInput from '../../../components/SearchInput';

const select =
  'h-10 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#e8793f] focus:ring-2 focus:ring-[#e8793f]/20';

function MemberFilters({ search, onSearchChange, trust, onTrustChange, trusts, appDownload, onAppDownloadChange, onReset, canReset }) {
  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center">
      <div className="lg:w-[26rem]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search name, email, company or mobile"
          label="Search members"
        />
      </div>

      <div className="lg:w-56">
        <select value={trust} onChange={(e) => onTrustChange(e.target.value)} className={select} aria-label="Filter by trust">
          <option value="">All trusts</option>
          {trusts.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="lg:w-44">
        <select
          value={appDownload}
          onChange={(e) => onAppDownloadChange(e.target.value)}
          className={select}
          aria-label="Filter by app download"
        >
          <option value="all">All members</option>
          <option value="yes">App downloaded</option>
          <option value="no">App not downloaded</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        className="h-10 cursor-pointer rounded-xl border border-gray-300 px-4 text-sm font-medium text-[#3a3f55] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset
      </button>
    </div>
  );
}

export default MemberFilters;
