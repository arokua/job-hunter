"use client";

const LOCATIONS = ["Adelaide", "Sydney", "Melbourne", "Remote"] as const;
const ROLES = [
  "Full Stack",
  "Frontend",
  "Backend",
  "Software Engineer",
  "AI/ML",
] as const;

interface PreferenceSelectorProps {
  selectedLocations: string[];
  selectedRoles: string[];
  onLocationsChange: (locations: string[]) => void;
  onRolesChange: (roles: string[]) => void;
}

export function PreferenceSelector({
  selectedLocations,
  selectedRoles,
  onLocationsChange,
  onRolesChange,
}: PreferenceSelectorProps) {
  const toggleLocation = (loc: string) => {
    onLocationsChange(
      selectedLocations.includes(loc)
        ? selectedLocations.filter((l) => l !== loc)
        : [...selectedLocations, loc],
    );
  };

  const toggleRole = (role: string) => {
    onRolesChange(
      selectedRoles.includes(role)
        ? selectedRoles.filter((r) => r !== role)
        : [...selectedRoles, role],
    );
  };

  return (
    <div className="space-y-6">
      {/* Locations */}
      <div>
        <p className="font-sans text-sm font-medium text-navy-300 mb-3 tracking-wide uppercase">
          Preferred locations{" "}
          <span className="text-navy-500 normal-case tracking-normal">
            (leave empty for all)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => {
            const isSelected = selectedLocations.includes(loc);
            return (
              <button
                key={loc}
                type="button"
                onClick={() => toggleLocation(loc)}
                className={`
                  px-4 py-2 rounded-full font-sans text-sm font-medium
                  border transition-all duration-200
                  ${
                    isSelected
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                      : "border-navy-600 bg-navy-800/60 text-navy-300 hover:border-navy-400 hover:text-navy-100"
                  }
                `}
              >
                {loc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roles */}
      <div>
        <p className="font-sans text-sm font-medium text-navy-300 mb-3 tracking-wide uppercase">
          Preferred roles{" "}
          <span className="text-navy-500 normal-case tracking-normal">
            (leave empty for all)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => {
            const isSelected = selectedRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`
                  px-4 py-2 rounded-full font-sans text-sm font-medium
                  border transition-all duration-200
                  ${
                    isSelected
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                      : "border-navy-600 bg-navy-800/60 text-navy-300 hover:border-navy-400 hover:text-navy-100"
                  }
                `}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
