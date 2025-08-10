import React, { useEffect, useState } from 'react';
import './MigrationDialog.css';

interface MigrationInfo {
  needsMigration: boolean;
  hasJsonFile: boolean;
  jsonFileSize?: number;
  bookCount?: number;
}

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete: () => void;
}

const MigrationDialog: React.FC<MigrationDialogProps> = ({ isOpen, onClose, onMigrationComplete }) => {
  const [migrationInfo, setMigrationInfo] = useState<MigrationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkMigrationStatus();
    }
  }, [isOpen]);

  const checkMigrationStatus = async () => {
    try {
      const info = await window.electron.migration.check();
      setMigrationInfo(info);
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  };

  const performMigration = async () => {
    setIsLoading(true);
    setMigrationResult(null);
    
    try {
      const result = await window.electron.migration.perform();
      setMigrationResult(result);
      
      if (result.success) {
        // Wait a bit before closing to show success message
        setTimeout(() => {
          onMigrationComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        message: `Migration failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="migration-dialog-overlay">
      <div className="migration-dialog">
        <div className="migration-dialog-header">
          <h2>Database Migration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="migration-dialog-content">
          {!migrationInfo ? (
            <div className="loading">Checking migration status...</div>
          ) : !migrationInfo.needsMigration ? (
            <div className="no-migration-needed">
              <p>✅ No migration needed. Your data is already using the new SQLite database.</p>
            </div>
          ) : (
            <div className="migration-needed">
              <div className="migration-info">
                <h3>Migration Required</h3>
                <p>We found an old JSON data file that needs to be migrated to the new SQLite database.</p>
                
                <div className="info-details">
                  <div className="info-item">
                    <strong>Books found:</strong> {migrationInfo.bookCount || 0}
                  </div>
                  <div className="info-item">
                    <strong>File size:</strong> {formatFileSize(migrationInfo.jsonFileSize)}
                  </div>
                </div>
                
                <div className="migration-benefits">
                  <h4>Benefits of SQLite:</h4>
                  <ul>
                    <li>Better performance with large datasets</li>
                    <li>More reliable data storage</li>
                    <li>Better support for concurrent operations</li>
                    <li>Automatic data integrity checks</li>
                  </ul>
                </div>
              </div>
              
              {migrationResult && (
                <div className={`migration-result ${migrationResult.success ? 'success' : 'error'}`}>
                  <p>{migrationResult.message}</p>
                </div>
              )}
              
              <div className="migration-actions">
                <button 
                  className="migrate-button"
                  onClick={performMigration}
                  disabled={isLoading}
                >
                  {isLoading ? 'Migrating...' : 'Start Migration'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationDialog;
