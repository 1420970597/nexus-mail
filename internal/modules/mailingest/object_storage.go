package mailingest

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type ObjectStorage interface {
	Upload(ctx context.Context, item PersistedMessage) (PersistedMessage, error)
	ReadObject(ctx context.Context, objectKey string) ([]byte, error)
}

type NopObjectStorage struct{}

func (NopObjectStorage) Upload(_ context.Context, item PersistedMessage) (PersistedMessage, error) {
	return item, nil
}

func (NopObjectStorage) ReadObject(context.Context, string) ([]byte, error) {
	return nil, os.ErrNotExist
}

type MinIOStorage struct {
	client *minio.Client
	bucket string
}

func NewMinIOStorage(endpoint, accessKey, secretKey string, useSSL bool, bucket string) (*MinIOStorage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}
	return &MinIOStorage{client: client, bucket: bucket}, nil
}

func (s *MinIOStorage) EnsureBucket(ctx context.Context) error {
	if s == nil || s.client == nil {
		return nil
	}
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check minio bucket: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("create minio bucket: %w", err)
	}
	return nil
}

func (s *MinIOStorage) Upload(ctx context.Context, item PersistedMessage) (PersistedMessage, error) {
	if s == nil || s.client == nil {
		return item, nil
	}
	rawObjectKey := filepath.ToSlash(filepath.Join("raw", filepath.Base(filepath.Dir(item.RawPath)), filepath.Base(item.RawPath)))
	metaObjectKey := filepath.ToSlash(filepath.Join("meta", filepath.Base(filepath.Dir(item.MetadataPath)), filepath.Base(item.MetadataPath)))
	if err := s.uploadFile(ctx, rawObjectKey, item.RawPath); err != nil {
		return item, err
	}
	if err := s.uploadFile(ctx, metaObjectKey, item.MetadataPath); err != nil {
		return item, err
	}
	item.RawObjectKey = rawObjectKey
	item.MetadataObjectKey = metaObjectKey
	return item, nil
}

func (s *MinIOStorage) ReadObject(ctx context.Context, objectKey string) ([]byte, error) {
	if s == nil || s.client == nil {
		return nil, os.ErrNotExist
	}
	obj, err := s.client.GetObject(ctx, s.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get minio object: %w", err)
	}
	defer obj.Close()
	payload, err := io.ReadAll(obj)
	if err != nil {
		return nil, fmt.Errorf("read minio object: %w", err)
	}
	return payload, nil
}

func (s *MinIOStorage) uploadFile(ctx context.Context, objectKey, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open upload file %s: %w", path, err)
	}
	defer file.Close()
	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("stat upload file %s: %w", path, err)
	}
	_, err = s.client.PutObject(ctx, s.bucket, objectKey, file, stat.Size(), minio.PutObjectOptions{ContentType: contentTypeForPath(path)})
	if err != nil {
		return fmt.Errorf("put object %s: %w", objectKey, err)
	}
	return nil
}

func contentTypeForPath(path string) string {
	switch filepath.Ext(path) {
	case ".json":
		return "application/json"
	default:
		return "message/rfc822"
	}
}
