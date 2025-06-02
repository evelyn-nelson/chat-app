package s3store

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Store interface {
	PresignUpload(ctx context.Context, key string, expires time.Duration) (string, error)
	PresignDownload(ctx context.Context, key string, expires time.Duration) (string, error)
}

type s3Store struct {
	presigner *s3.PresignClient
	bucket    string
}

func New(cfg aws.Config, bucket string) Store {
	client := s3.NewFromConfig(cfg)
	presigner := s3.NewPresignClient(client)
	return &s3Store{
		presigner: presigner,
		bucket:    bucket,
	}
}

func (s *s3Store) PresignUpload(ctx context.Context, key string, expires time.Duration) (string, error) {
	out, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: &s.bucket,
		Key:    &key,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expires
	})
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

func (s *s3Store) PresignDownload(ctx context.Context, key string, expires time.Duration) (string, error) {
	out, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    &key,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expires
	})
	if err != nil {
		return "", err
	}
	return out.URL, nil
}
