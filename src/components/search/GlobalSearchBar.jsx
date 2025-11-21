import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function GlobalSearchBar({ jobs, deliveryTypes, onJobSelect, placeholder = "Search jobs..." }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = jobs.filter(job => {
      const searchableText = [
        job.customerName,
        job.deliveryLocation,
        job.poSalesDocketNumber,
        job.siteContactName,
        job.siteContactPhone,
        job.deliveryNotes,
        job.deliveryTypeName
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(query);
    }).slice(0, 8);

    setSearchResults(results);
    setIsOpen(results.length > 0);
  }, [searchQuery, jobs]);

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleSelectJob = (job) => {
    setIsOpen(false);
    setSearchQuery('');
    if (onJobSelect) {
      onJobSelect(job);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchResults.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          <div className="p-2 space-y-1">
            {searchResults.map(job => {
              const deliveryType = deliveryTypes.find(dt => dt.id === job.deliveryTypeId);
              return (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
                  className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {job.customerName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {job.deliveryLocation}
                      </p>
                      {job.poSalesDocketNumber && (
                        <p className="text-xs text-gray-500 mt-1">
                          Docket: {job.poSalesDocketNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {deliveryType?.code && (
                        <Badge variant="outline" className="text-xs">
                          {deliveryType.code}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {job.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}