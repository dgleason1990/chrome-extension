
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './dialog';
import { Button } from './button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { X } from 'lucide-react';

interface SQLResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, unknown>[] | null;
}

export const SQLResultsModal: React.FC<SQLResultsModalProps> = ({ 
  isOpen, 
  onClose, 
  data 
}) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            SQL Query Results
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {headers.map((header) => (
                    <TableCell key={`${index}-${header}`}>
                      {String(row[header] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <DialogFooter className="px-6 py-4">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm text-muted-foreground">
              {data.length} {data.length === 1 ? 'row' : 'rows'} returned
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
